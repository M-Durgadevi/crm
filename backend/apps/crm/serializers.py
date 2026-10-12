from rest_framework import serializers
from django.db.models import Q

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
from .workflow_engine import ACTION_TYPES, TRIGGER_EVENTS


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = '__all__'

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.email
        return None


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = '__all__'


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'

    def validate(self, attrs):
        account = attrs.get('account', getattr(self.instance, 'account', None))
        validate_employee_links(self, {'account': account})
        return attrs


class DealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = '__all__'
        read_only_fields = ('closed_at',)

    def validate(self, attrs):
        amount = attrs.get('amount', getattr(self.instance, 'amount', 0))
        probability = attrs.get('probability', getattr(self.instance, 'probability', 0))
        account = attrs.get('account', getattr(self.instance, 'account', None))
        contact = attrs.get('contact', getattr(self.instance, 'contact', None))
        if amount < 0:
            raise serializers.ValidationError({'amount': 'Deal amount cannot be negative.'})
        if probability > 100:
            raise serializers.ValidationError({'probability': 'Probability must be between 0 and 100.'})
        if account and contact and contact.account_id not in (None, account.id):
            raise serializers.ValidationError({'contact': 'Contact must belong to the selected account.'})
        request = self.context.get('request')
        if request and request.user.role == 'employee':
            for relation_name, relation in (('account', account), ('contact', contact)):
                if relation and relation.assigned_to_id not in (None, request.user.id):
                    raise serializers.ValidationError({relation_name: 'You cannot link records owned by another salesperson.'})
        return attrs


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'

    def validate(self, attrs):
        return validate_related_record(self, attrs)


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = '__all__'

    def validate(self, attrs):
        return validate_related_record(self, attrs)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = '__all__'

    def validate(self, attrs):
        trigger_event = attrs.get('trigger_event', getattr(self.instance, 'trigger_event', ''))
        actions = attrs.get('actions', getattr(self.instance, 'actions', []))
        if trigger_event not in TRIGGER_EVENTS:
            raise serializers.ValidationError({'trigger_event': 'Choose a supported workflow trigger.'})
        if not isinstance(actions, list) or not actions:
            raise serializers.ValidationError({'actions': 'Add at least one supported action.'})
        for index, action in enumerate(actions):
            if not isinstance(action, dict) or action.get('type') not in ACTION_TYPES:
                raise serializers.ValidationError({'actions': f'Action {index + 1} has an unsupported type.'})
            required_by_type = {
                'create_follow_up_task': ('title',),
                'notify_assignee': ('title', 'message'),
                'create_activity': ('subject',),
            }
            missing = [key for key in required_by_type[action['type']] if not action.get(key)]
            if missing:
                raise serializers.ValidationError({'actions': f'Action {index + 1} requires {", ".join(missing)}.'})
            if action['type'] == 'create_follow_up_task':
                try:
                    due_in_days = int(action.get('due_in_days', 1))
                except (TypeError, ValueError) as error:
                    raise serializers.ValidationError({'actions': 'Task due_in_days must be an integer from 0 to 365.'}) from error
                if not 0 <= due_in_days <= 365:
                    raise serializers.ValidationError({'actions': 'Task due_in_days must be between 0 and 365.'})
        return attrs


class WorkflowExecutionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowExecutionLog
        fields = '__all__'


class CustomerRequestSerializer(serializers.ModelSerializer):
    requested_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CustomerRequest
        fields = '__all__'

    def validate(self, attrs):
        account = attrs.get('account', getattr(self.instance, 'account', None))
        deal = attrs.get('deal', getattr(self.instance, 'deal', None))
        if deal and account and deal.account_id not in (None, account.id):
            raise serializers.ValidationError({'deal': 'The selected deal does not belong to this account.'})
        validate_employee_links(self, {'account': account, 'deal': deal})
        return attrs


class RequestUpdateSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = RequestUpdate
        fields = ('id', 'request', 'author', 'body', 'created_at')
        read_only_fields = ('id', 'request', 'author', 'created_at')


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

    def validate_base_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Base price cannot be negative.')
        return value


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

    def validate(self, attrs):
        progress = attrs.get('progress', getattr(self.instance, 'progress', 0))
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        due_date = attrs.get('due_date', getattr(self.instance, 'due_date', None))
        if progress > 100:
            raise serializers.ValidationError({'progress': 'Progress must be between 0 and 100.'})
        if start_date and due_date and start_date > due_date:
            raise serializers.ValidationError({'due_date': 'Due date cannot be earlier than the start date.'})
        validate_employee_links(self, {
            'account': attrs.get('account', getattr(self.instance, 'account', None)),
            'deal': attrs.get('deal', getattr(self.instance, 'deal', None)),
        })
        request = self.context.get('request')
        members = attrs.get('members')
        if request and request.user.role == 'employee' and members is not None and any(member.pk != request.user.pk for member in members):
            raise serializers.ValidationError({'members': 'Employees may only add themselves to a project team.'})
        return attrs


class CustomerFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerFeedback
        fields = '__all__'

    def validate(self, attrs):
        rating = attrs.get('rating', getattr(self.instance, 'rating', 0))
        account = attrs.get('account', getattr(self.instance, 'account', None))
        contact = attrs.get('contact', getattr(self.instance, 'contact', None))
        if not 1 <= rating <= 5:
            raise serializers.ValidationError({'rating': 'Rating must be from 1 to 5.'})
        if account and contact and contact.account_id not in (None, account.id):
            raise serializers.ValidationError({'contact': 'Contact must belong to the selected account.'})
        validate_employee_links(self, {'account': account, 'contact': contact})
        return attrs


class SalesResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesResource
        fields = '__all__'

    def validate_url(self, value):
        if not value.startswith('https://'):
            raise serializers.ValidationError('Sales resources must use a secure HTTPS URL.')
        return value


class DealStageHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DealStageHistory
        fields = '__all__'
        read_only_fields = ('id', 'deal', 'previous_stage', 'new_stage', 'changed_by', 'changed_at')


def validate_related_record(serializer, attrs):
    instance = serializer.instance
    related_model = attrs.get('related_model', getattr(instance, 'related_model', ''))
    related_id = attrs.get('related_id', getattr(instance, 'related_id', 0))
    if not related_model:
        return attrs

    model_by_name = {
        'lead': Lead,
        'contact': Contact,
        'account': Account,
        'deal': Deal,
        'project': Project,
    }
    model = model_by_name.get(related_model)
    if model is None or not related_id:
        raise serializers.ValidationError({'related_id': 'Choose an existing supported CRM record.'})

    queryset = model.objects.filter(pk=related_id)
    request = serializer.context.get('request')
    if request and request.user.role == 'employee':
        if model is Project:
            queryset = queryset.filter(Q(owner=request.user) | Q(members=request.user)).distinct()
        elif hasattr(model, 'assigned_to'):
            queryset = queryset.filter(assigned_to=request.user)
    if not queryset.exists():
        raise serializers.ValidationError({'related_id': 'The related record does not exist or is not accessible.'})
    return attrs


def validate_employee_links(serializer, relations):
    request = serializer.context.get('request')
    if not request or request.user.role != 'employee':
        return
    for field, relation in relations.items():
        if relation and getattr(relation, 'assigned_to_id', request.user.pk) not in (None, request.user.pk):
            raise serializers.ValidationError({field: 'You cannot link records owned by another salesperson.'})
