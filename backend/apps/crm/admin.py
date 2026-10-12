from django.contrib import admin

from .models import Account, Activity, Contact, Deal, Lead, Notification, Task, Workflow, WorkflowExecutionLog

admin.site.register(Lead)
admin.site.register(Contact)
admin.site.register(Account)
admin.site.register(Deal)
admin.site.register(Task)
admin.site.register(Activity)
admin.site.register(Notification)
admin.site.register(Workflow)
admin.site.register(WorkflowExecutionLog)
