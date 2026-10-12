from django.conf import settings
from django.db import models
from django.utils import timezone


class Lead(models.Model):
    STATUS_CHOICES = (
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('unqualified', 'Unqualified'),
        ('converted', 'Converted'),
    )
    SOURCE_CHOICES = (
        ('website', 'Website'),
        ('referral', 'Referral'),
        ('social', 'Social'),
        ('email', 'Email'),
        ('other', 'Other'),
    )

    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    company = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    lead_source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='website')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='new')
    industry = models.CharField(max_length=80, blank=True)
    designation = models.CharField(max_length=120, blank=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')
    converted_account = models.ForeignKey('Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='converted_leads')
    converted_contact = models.ForeignKey('Contact', on_delete=models.SET_NULL, null=True, blank=True, related_name='converted_leads')
    converted_deal = models.ForeignKey('Deal', on_delete=models.SET_NULL, null=True, blank=True, related_name='converted_leads')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class Account(models.Model):
    name = models.CharField(max_length=160)
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    billing_address = models.TextField(blank=True)
    description = models.TextField(blank=True)
    services = models.ManyToManyField('Service', blank=True, related_name='accounts')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_accounts')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Contact(models.Model):
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    job_title = models.CharField(max_length=120, blank=True)
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='contacts')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_contacts')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class Deal(models.Model):
    STAGE_CHOICES = (
        ('qualification', 'Qualification'),
        ('needs_analysis', 'Needs Analysis'),
        ('proposal', 'Proposal'),
        ('negotiation', 'Negotiation'),
        ('closed_won', 'Closed Won'),
        ('closed_lost', 'Closed Lost'),
    )

    name = models.CharField(max_length=160)
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES, default='qualification')
    probability = models.PositiveIntegerField(default=0)
    expected_closing_date = models.DateField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_deals')
    description = models.TextField(blank=True)
    services = models.ManyToManyField('Service', blank=True, related_name='deals')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class DealStageHistory(models.Model):
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='stage_history')
    previous_stage = models.CharField(max_length=30, blank=True)
    new_stage = models.CharField(max_length=30, choices=Deal.STAGE_CHOICES)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='deal_stage_changes')
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['changed_at']

    def __str__(self):
        return f'{self.deal.name}: {self.previous_stage} -> {self.new_stage}'


class Task(models.Model):
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )

    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    related_model = models.CharField(max_length=50, blank=True)
    related_id = models.IntegerField(default=0)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Activity(models.Model):
    TYPE_CHOICES = (
        ('call', 'Call'),
        ('meeting', 'Meeting'),
        ('email', 'Email'),
        ('follow_up', 'Follow-up'),
        ('note', 'Note'),
    )

    activity_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='call')
    subject = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    related_model = models.CharField(max_length=50, blank=True)
    related_id = models.IntegerField(default=0)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.subject


class Workflow(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    trigger_event = models.CharField(max_length=60, default='lead_created')
    actions = models.JSONField(default=list, blank=True)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class WorkflowExecutionLog(models.Model):
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='logs')
    event_type = models.CharField(max_length=60)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, default='success')
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.workflow.name} - {self.status}'


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('task', 'Task'),
        ('overdue', 'Overdue'),
        ('workflow', 'Workflow'),
        ('system', 'System'),
    )

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=160)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, default='system')
    related_model = models.CharField(max_length=50, blank=True)
    related_id = models.IntegerField(default=0)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class CustomerRequest(models.Model):
    STATUS_CHOICES = (
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('waiting', 'Waiting'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    )
    PRIORITY_CHOICES = Task.PRIORITY_CHOICES

    title = models.CharField(max_length=180)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='crm_requests')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_crm_requests')
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='service_requests')
    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='service_requests')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class RequestUpdate(models.Model):
    request = models.ForeignKey(CustomerRequest, on_delete=models.CASCADE, related_name='updates')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='request_updates')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Update for {self.request_id}'


class Service(models.Model):
    name = models.CharField(max_length=160, unique=True)
    code = models.CharField(max_length=40, unique=True)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Project(models.Model):
    STATUS_CHOICES = (
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    PRIORITY_CHOICES = Task.PRIORITY_CHOICES

    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='owned_projects')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='crm_projects')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    progress = models.PositiveSmallIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='projects')
    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class CustomerFeedback(models.Model):
    SOURCE_CHOICES = (
        ('survey', 'Survey'),
        ('email', 'Email'),
        ('call', 'Call'),
        ('social', 'Social'),
        ('other', 'Other'),
    )
    STATUS_CHOICES = (
        ('new', 'New'),
        ('reviewing', 'Reviewing'),
        ('actioned', 'Actioned'),
        ('closed', 'Closed'),
    )

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='survey')
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback')
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='feedback')
    rating = models.PositiveSmallIntegerField()
    category = models.CharField(max_length=80)
    comments = models.TextField()
    received_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_feedback')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.category} feedback ({self.rating}/5)'


class SalesResource(models.Model):
    TYPE_CHOICES = (
        ('playbook', 'Playbook'),
        ('template', 'Template'),
        ('presentation', 'Presentation'),
        ('document', 'Document'),
    )

    title = models.CharField(max_length=180)
    resource_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='document')
    description = models.TextField(blank=True)
    url = models.URLField()
    approved = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_resources')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
