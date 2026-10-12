from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import filters, viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated
from rest_framework.response import Response

from .models import (
    Account,
    Activity,
    Contact,
    CustomerFeedback,
    CustomerRequest,
    Deal,
    DealStageHistory,
    Lead,
    Notification,
    Project,
    RequestUpdate,
    SalesResource,
    Service,
    Task,
    Workflow,
    WorkflowExecutionLog,
)
from .serializers import (
    AccountSerializer,
    ActivitySerializer,
    ContactSerializer,
    CustomerFeedbackSerializer,
    CustomerRequestSerializer,
    DealSerializer,
    DealStageHistorySerializer,
    LeadSerializer,
    NotificationSerializer,
    ProjectSerializer,
    RequestUpdateSerializer,
    SalesResourceSerializer,
    ServiceSerializer,
    TaskSerializer,
    WorkflowExecutionLogSerializer,
    WorkflowSerializer,
)
from .workflow_engine import run_workflows

class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ('manager', 'admin'))


class IsManagerOrAdminOrReadOnly(IsManagerOrAdmin):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.method in SAFE_METHODS or request.user.role in ('manager', 'admin')))


class RoleFilterMixin:
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'employee':
            return qs.filter(assigned_to=user)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role == 'employee' and hasattr(serializer.Meta.model, 'assigned_to'):
            instance = serializer.save(assigned_to=self.request.user)
        else:
            instance = serializer.save()
        if isinstance(instance, Lead):
            run_workflows('lead_created', instance, self.request.user)
        elif isinstance(instance, Task) and instance.assigned_to_id:
            run_workflows('task_assigned', instance, self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = getattr(instance, 'status', None)
        old_stage = getattr(instance, 'stage', None)
        old_assigned_to_id = getattr(instance, 'assigned_to_id', None)
        if self.request.user.role == 'employee' and hasattr(serializer.Meta.model, 'assigned_to'):
            instance = serializer.save(assigned_to=self.request.user)
        else:
            instance = serializer.save()
        if isinstance(instance, Lead) and old_status != 'qualified' and instance.status == 'qualified':
            run_workflows('lead_qualified', instance, self.request.user)
        elif isinstance(instance, Task) and old_assigned_to_id != instance.assigned_to_id and instance.assigned_to_id:
            run_workflows('task_assigned', instance, self.request.user)
        elif isinstance(instance, Deal) and old_stage != instance.stage:
            run_workflows('deal_stage_changed', instance, self.request.user)


class LeadViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    queryset = Lead.objects.select_related('assigned_to').all().order_by('-created_at')
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['first_name', 'last_name', 'company', 'email', 'phone', 'status', 'lead_source']
    ordering_fields = ['created_at', 'updated_at', 'first_name', 'last_name', 'company', 'status']

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        lead = self.get_object()
        if lead.status != 'qualified' or lead.converted_contact_id:
            raise ValidationError({'detail': 'Only unconverted qualified leads can be converted.'})

        with transaction.atomic():
            account = Account.objects.filter(name__iexact=lead.company).first()
            if account and request.user.role == 'employee' and account.assigned_to_id not in (None, request.user.id):
                raise ValidationError({'detail': 'This company account is owned by another salesperson.'})
            if not account:
                account = Account.objects.create(
                    name=lead.company,
                    industry=lead.industry,
                    phone=lead.phone,
                    assigned_to=lead.assigned_to or request.user,
                )
            elif account.assigned_to_id is None:
                account.assigned_to = lead.assigned_to or request.user
                account.save(update_fields=['assigned_to'])

            contact = Contact.objects.filter(email__iexact=lead.email).first()
            if contact and request.user.role == 'employee' and contact.assigned_to_id not in (None, request.user.id):
                raise ValidationError({'detail': 'This contact email is already owned by another salesperson.'})
            if not contact:
                contact = Contact.objects.create(
                    first_name=lead.first_name,
                    last_name=lead.last_name,
                    email=lead.email,
                    phone=lead.phone,
                    job_title=lead.designation,
                    account=account,
                    assigned_to=lead.assigned_to or request.user,
                    notes=lead.notes,
                )
            elif contact.account_id is None:
                contact.account = account
                contact.save(update_fields=['account'])

            deal = None
            if request.data.get('create_deal') is True:
                deal_serializer = DealSerializer(data={
                    'name': request.data.get('deal_name') or f'{lead.company} opportunity',
                    'account': account.pk,
                    'contact': contact.pk,
                    'amount': request.data.get('amount', 0),
                    'stage': 'qualification',
                    'probability': 10,
                    'assigned_to': (lead.assigned_to or request.user).pk,
                })
                deal_serializer.is_valid(raise_exception=True)
                deal = deal_serializer.save()

            lead.status = 'converted'
            lead.converted_account = account
            lead.converted_contact = contact
            lead.converted_deal = deal
            lead.save(update_fields=['status', 'converted_account', 'converted_contact', 'converted_deal', 'updated_at'])
            Activity.objects.create(
                activity_type='note',
                subject='Lead converted',
                description=f'Converted to account {account.name} and contact {contact.email}.',
                related_model='lead',
                related_id=lead.pk,
                assigned_to=lead.assigned_to or request.user,
                completed=True,
            )

        return Response(LeadSerializer(lead).data, status=status.HTTP_200_OK)


class AccountViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    queryset = Account.objects.select_related('assigned_to').all().order_by('-created_at')
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'industry', 'email', 'phone']
    ordering_fields = ['created_at', 'name', 'industry']


class ContactViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    queryset = Contact.objects.select_related('account', 'assigned_to').all().order_by('-created_at')
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'job_title']
    ordering_fields = ['created_at', 'first_name', 'last_name', 'email']


class DealViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    queryset = Deal.objects.select_related('account', 'contact', 'assigned_to').all().order_by('-created_at')
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'stage', 'description', 'account__name', 'contact__email']
    ordering_fields = ['created_at', 'name', 'amount', 'stage', 'expected_closing_date']

    def perform_create(self, serializer):
        if self.request.user.role == 'employee':
            deal = serializer.save(assigned_to=self.request.user)
        else:
            deal = serializer.save()
        if deal.stage in ('closed_won', 'closed_lost'):
            deal.closed_at = timezone.now()
            deal.save(update_fields=['closed_at'])
        DealStageHistory.objects.create(deal=deal, new_stage=deal.stage, changed_by=self.request.user)

    def perform_update(self, serializer):
        previous_stage = serializer.instance.stage
        deal = super().perform_update(serializer)
        if serializer.instance.stage != previous_stage:
            serializer.instance.closed_at = timezone.now() if serializer.instance.stage in ('closed_won', 'closed_lost') else None
            serializer.instance.save(update_fields=['closed_at'])
            DealStageHistory.objects.create(
                deal=serializer.instance,
                previous_stage=previous_stage,
                new_stage=serializer.instance.stage,
                changed_by=self.request.user,
            )

    @action(detail=True, methods=['get'], url_path='stage-history')
    def stage_history(self, request, pk=None):
        deal = self.get_object()
        history = deal.stage_history.select_related('changed_by').all()
        return Response(DealStageHistorySerializer(history, many=True).data)


class TaskViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    queryset = Task.objects.select_related('assigned_to').all().order_by('-created_at')
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['title', 'description', 'status', 'priority']
    ordering_fields = ['created_at', 'title', 'due_date', 'status', 'priority']


class ActivityViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    queryset = Activity.objects.select_related('assigned_to').all().order_by('-created_at')
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['subject', 'description', 'activity_type']
    ordering_fields = ['created_at', 'subject', 'scheduled_at', 'activity_type']


class CustomerRequestViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    queryset = CustomerRequest.objects.select_related('requested_by', 'assigned_to', 'account', 'deal').all().order_by('-created_at')
    serializer_class = CustomerRequestSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['title', 'description', 'status', 'priority']
    ordering_fields = ['created_at', 'updated_at', 'title', 'status', 'priority']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == 'employee':
            queryset = CustomerRequest.objects.filter(Q(requested_by=self.request.user) | Q(assigned_to=self.request.user))
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.role == 'employee':
            serializer.save(requested_by=self.request.user, assigned_to=self.request.user)
        else:
            serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=['get'], url_path='updates')
    def updates(self, request, pk=None):
        customer_request = self.get_object()
        updates = customer_request.updates.select_related('author').all()
        return Response(RequestUpdateSerializer(updates, many=True).data)

    @action(detail=True, methods=['post'], url_path='add-update')
    def add_update(self, request, pk=None):
        customer_request = self.get_object()
        serializer = RequestUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update = serializer.save(request=customer_request, author=request.user)
        return Response(RequestUpdateSerializer(update).data, status=status.HTTP_201_CREATED)


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all().order_by('name')
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdminOrReadOnly]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'base_price', 'created_at']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == 'employee':
            queryset = queryset.filter(is_active=True)
        return queryset


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related('owner', 'account', 'deal').prefetch_related('members').all().order_by('-created_at')
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'description', 'status', 'priority', 'account__name', 'deal__name']
    ordering_fields = ['created_at', 'updated_at', 'name', 'status', 'priority', 'due_date', 'progress']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == 'employee':
            queryset = queryset.filter(Q(owner=self.request.user) | Q(members=self.request.user)).distinct()
        return queryset

    def perform_create(self, serializer):
        owner = self.request.user if self.request.user.role == 'employee' else serializer.validated_data.get('owner')
        serializer.save(owner=owner)

    def perform_update(self, serializer):
        if self.request.user.role == 'employee' and serializer.instance.owner_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only a project owner or manager can edit this project.')
        serializer.save()


class CustomerFeedbackViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    queryset = CustomerFeedback.objects.select_related('account', 'contact', 'assigned_to').all().order_by('-received_at')
    serializer_class = CustomerFeedbackSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['category', 'comments', 'status', 'source']
    ordering_fields = ['received_at', 'rating', 'status', 'created_at']


class SalesResourceViewSet(viewsets.ModelViewSet):
    queryset = SalesResource.objects.select_related('owner').all().order_by('-created_at')
    serializer_class = SalesResourceSerializer
    search_fields = ['title', 'description', 'resource_type']
    ordering_fields = ['created_at', 'title', 'resource_type']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsManagerOrAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == 'employee':
            queryset = queryset.filter(active=True, approved=True)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.select_related('recipient').all().order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(recipient=user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data['unread_count'] = self.get_queryset().filter(is_read=False).count()
        return response

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all().order_by('-created_at')
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]


class WorkflowExecutionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkflowExecutionLog.objects.select_related('workflow').all().order_by('-created_at')
    serializer_class = WorkflowExecutionLogSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    leads = Lead.objects.all()
    contacts = Contact.objects.all()
    accounts = Account.objects.all()
    deals = Deal.objects.all()
    tasks = Task.objects.all()
    activities = Activity.objects.all()

    if request.user.role == 'employee':
        leads = leads.filter(assigned_to=request.user)
        contacts = contacts.filter(assigned_to=request.user)
        accounts = accounts.filter(assigned_to=request.user)
        deals = deals.filter(assigned_to=request.user)
        tasks = tasks.filter(assigned_to=request.user)
        activities = activities.filter(assigned_to=request.user)

    today = timezone.localdate()
    open_deals = deals.exclude(stage__in=['closed_won', 'closed_lost'])

    summary = {
        'total_leads': leads.count(),
        'total_contacts': contacts.count(),
        'total_accounts': accounts.count(),
        'total_deals': open_deals.count(),
        'open_tasks': tasks.filter(status__in=['pending', 'in_progress']).count(),
        'completed_tasks': tasks.filter(status='completed').count(),
        'overdue_tasks': tasks.filter(status__in=['pending', 'in_progress'], due_date__lt=today).count(),
        'total_deal_value': float(open_deals.aggregate(total=Sum('amount'))['total'] or 0),
        'calls_today': activities.filter(activity_type='call', scheduled_at__date=today).count(),
        'lead_status': [
            {'name': 'New', 'value': leads.filter(status='new').count()},
            {'name': 'Contacted', 'value': leads.filter(status='contacted').count()},
            {'name': 'Qualified', 'value': leads.filter(status='qualified').count()},
            {'name': 'Unqualified', 'value': leads.filter(status='unqualified').count()},
        ],
        'deal_stage': [
            {'name': 'Qualification', 'value': deals.filter(stage='qualification').count()},
            {'name': 'Needs Analysis', 'value': deals.filter(stage='needs_analysis').count()},
            {'name': 'Proposal', 'value': deals.filter(stage='proposal').count()},
            {'name': 'Negotiation', 'value': deals.filter(stage='negotiation').count()},
            {'name': 'Closed Won', 'value': deals.filter(stage='closed_won').count()},
            {'name': 'Closed Lost', 'value': deals.filter(stage='closed_lost').count()},
        ],
        'recent_leads': LeadSerializer(leads.order_by('-created_at')[:5], many=True).data,
        'recent_deals': DealSerializer(deals.order_by('-created_at')[:5], many=True).data,
        'upcoming_tasks': TaskSerializer(tasks.filter(status__in=['pending', 'in_progress'], due_date__isnull=False).order_by('due_date')[:8], many=True).data,
    }
    return Response(summary, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    query = request.query_params.get('q', '').strip()
    if len(query) < 2:
        return Response({'detail': 'Enter at least two characters to search.'}, status=status.HTTP_400_BAD_REQUEST)

    models = [
        ('lead', Lead.objects.filter(Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(company__icontains=query) | Q(email__icontains=query))),
        ('contact', Contact.objects.filter(Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(email__icontains=query))),
        ('account', Account.objects.filter(Q(name__icontains=query) | Q(industry__icontains=query))),
        ('deal', Deal.objects.filter(Q(name__icontains=query) | Q(description__icontains=query))),
        ('task', Task.objects.filter(Q(title__icontains=query) | Q(description__icontains=query))),
        ('activity', Activity.objects.filter(Q(subject__icontains=query) | Q(description__icontains=query))),
        ('request', CustomerRequest.objects.filter(Q(title__icontains=query) | Q(description__icontains=query))),
        ('project', Project.objects.filter(Q(name__icontains=query) | Q(description__icontains=query))),
        ('feedback', CustomerFeedback.objects.filter(Q(category__icontains=query) | Q(comments__icontains=query))),
        ('service', Service.objects.filter(Q(name__icontains=query) | Q(code__icontains=query) | Q(description__icontains=query))),
        ('sales_resource', SalesResource.objects.filter(Q(title__icontains=query) | Q(description__icontains=query))),
    ]
    paths = {
        'lead': 'leads', 'contact': 'contacts', 'account': 'accounts', 'deal': 'deals',
        'task': 'tasks', 'activity': 'activities', 'request': 'requests', 'project': 'projects',
        'feedback': 'feedback', 'service': 'services', 'sales_resource': 'sales-resources',
    }
    results = []
    for model_name, queryset in models:
        if request.user.role == 'employee':
            if model_name == 'request':
                queryset = queryset.filter(Q(requested_by=request.user) | Q(assigned_to=request.user))
            elif model_name == 'project':
                queryset = queryset.filter(Q(owner=request.user) | Q(members=request.user)).distinct()
            elif model_name == 'service':
                queryset = queryset.filter(is_active=True)
            elif model_name == 'sales_resource':
                queryset = queryset.filter(active=True, approved=True)
            elif hasattr(queryset.model, 'assigned_to'):
                queryset = queryset.filter(assigned_to=request.user)
        for record in queryset.order_by('-created_at')[:10]:
            if model_name in ('lead', 'contact'):
                title = f'{record.first_name} {record.last_name}'
                subtitle = getattr(record, 'company', None) or record.email
            elif model_name == 'account':
                title, subtitle = record.name, record.industry
            elif model_name == 'deal':
                title, subtitle = record.name, record.get_stage_display()
            elif model_name == 'task':
                title, subtitle = record.title, record.get_status_display()
            elif model_name == 'activity':
                title, subtitle = record.subject, record.get_activity_type_display()
            elif model_name == 'request':
                title, subtitle = record.title, record.get_status_display()
            elif model_name == 'project':
                title, subtitle = record.name, record.get_status_display()
            elif model_name == 'feedback':
                title, subtitle = record.category, f'{record.rating}/5 · {record.get_status_display()}'
            elif model_name == 'service':
                title, subtitle = record.name, record.code
            else:
                title, subtitle = record.title, record.get_resource_type_display()
            results.append({
                'id': record.pk,
                'type': model_name,
                'title': title,
                'subtitle': subtitle or '',
                'url': f'/records/{paths[model_name]}',
            })
    return Response({'results': results, 'count': len(results)}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def crm_reports(request):
    date_from = parse_date(request.query_params.get('date_from', ''))
    date_to = parse_date(request.query_params.get('date_to', ''))
    if request.query_params.get('date_from') and not date_from:
        return Response({'date_from': 'Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
    if request.query_params.get('date_to') and not date_to:
        return Response({'date_to': 'Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
    if date_from and date_to and date_from > date_to:
        return Response({'detail': 'date_from must not be later than date_to.'}, status=status.HTTP_400_BAD_REQUEST)

    leads = Lead.objects.all()
    contacts = Contact.objects.all()
    accounts = Account.objects.all()
    deals = Deal.objects.all()
    closed_deals = Deal.objects.filter(stage='closed_won', closed_at__isnull=False)
    tasks = Task.objects.all()
    if request.user.role == 'employee':
        leads = leads.filter(assigned_to=request.user)
        contacts = contacts.filter(assigned_to=request.user)
        accounts = accounts.filter(assigned_to=request.user)
        deals = deals.filter(assigned_to=request.user)
        closed_deals = closed_deals.filter(assigned_to=request.user)
        tasks = tasks.filter(assigned_to=request.user)

    def apply_date_range(queryset):
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        return queryset

    leads = apply_date_range(leads)
    contacts = apply_date_range(contacts)
    accounts = apply_date_range(accounts)
    deals = apply_date_range(deals)
    tasks = apply_date_range(tasks)
    if date_from:
        closed_deals = closed_deals.filter(closed_at__date__gte=date_from)
    if date_to:
        closed_deals = closed_deals.filter(closed_at__date__lte=date_to)

    leads_by_status = list(leads.values('status').annotate(value=Count('id')).order_by('status'))
    leads_by_source = list(leads.values('lead_source').annotate(value=Count('id')).order_by('lead_source'))
    deals_by_stage = list(deals.values('stage').annotate(count=Count('id'), value=Sum('amount')).order_by('stage'))
    monthly_sales = list(
        closed_deals.annotate(month=TruncMonth('closed_at'))
        .values('month').annotate(value=Sum('amount'), deals=Count('id')).order_by('month')
    )
    task_status = list(tasks.values('status').annotate(value=Count('id')).order_by('status'))
    owner_sales = []
    if request.user.role in ('manager', 'admin'):
        owner_sales = list(
            deals.values('assigned_to_id', 'assigned_to__first_name', 'assigned_to__last_name', 'assigned_to__email')
            .annotate(open_deals=Count('id'), total_value=Sum('amount'))
            .order_by('-total_value')
        )

    return Response({
        'date_from': date_from,
        'date_to': date_to,
        'leads_by_status': leads_by_status,
        'leads_by_source': leads_by_source,
        'deals_by_stage': deals_by_stage,
        'monthly_sales': [
            {'month': row['month'].strftime('%Y-%m') if row['month'] else None, 'value': float(row['value'] or 0), 'deals': row['deals']}
            for row in monthly_sales
        ],
        'tasks_by_status': task_status,
        'overdue_tasks': tasks.filter(status__in=['pending', 'in_progress'], due_date__lt=timezone.localdate()).count(),
        'owner_sales': [
            {
                'owner': ' '.join(filter(None, [row['assigned_to__first_name'], row['assigned_to__last_name']])) or row['assigned_to__email'] or 'Unassigned',
                'deals': row['open_deals'],
                'value': float(row['total_value'] or 0),
            }
            for row in owner_sales
        ],
    }, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    try:
        notification = Notification.objects.get(pk=pk, recipient=request.user)
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)
    except Notification.DoesNotExist:
        return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'Notifications marked as read.'}, status=status.HTTP_200_OK)


