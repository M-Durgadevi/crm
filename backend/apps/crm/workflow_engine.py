from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import Activity, Notification, Task, Workflow, WorkflowExecutionLog

TRIGGER_EVENTS = {
    'lead_created',
    'lead_qualified',
    'task_assigned',
    'task_overdue',
    'deal_stage_changed',
}
ACTION_TYPES = {
    'create_follow_up_task',
    'notify_assignee',
    'create_activity',
}


def _record_reference(record):
    model_names = {
        'Lead': 'lead',
        'Contact': 'contact',
        'Account': 'account',
        'Deal': 'deal',
        'Task': 'task',
    }
    return model_names.get(type(record).__name__, ''), record.pk


def _run_action(action, record, actor):
    assigned_to = getattr(record, 'assigned_to', None) or actor
    related_model, related_id = _record_reference(record)
    action_type = action['type']

    if action_type == 'create_follow_up_task':
        due_in_days = int(action.get('due_in_days', 1))
        Task.objects.create(
            title=action['title'],
            description=action.get('description', ''),
            assigned_to=assigned_to,
            related_model=related_model,
            related_id=related_id,
            due_date=timezone.localdate() + timedelta(days=due_in_days),
            priority=action.get('priority', 'medium'),
        )
    elif action_type == 'notify_assignee':
        Notification.objects.create(
            recipient=assigned_to,
            title=action['title'],
            message=action['message'],
            notification_type='workflow',
            related_model=related_model,
            related_id=related_id,
        )
    elif action_type == 'create_activity':
        Activity.objects.create(
            activity_type=action.get('activity_type', 'note'),
            subject=action['subject'],
            description=action.get('description', ''),
            related_model=related_model,
            related_id=related_id,
            assigned_to=assigned_to,
            completed=False,
        )


def run_workflows(event_type, record, actor=None, workflow_ids=None):
    related_model, related_id = _record_reference(record)
    payload = {
        'record_type': related_model,
        'record_id': related_id,
        'actor_id': getattr(actor, 'pk', None),
    }
    workflows = Workflow.objects.filter(enabled=True, trigger_event=event_type)
    if workflow_ids is not None:
        workflows = workflows.filter(pk__in=workflow_ids)
    for workflow in workflows:
        try:
            with transaction.atomic():
                for action in workflow.actions:
                    _run_action(action, record, actor)
        except Exception as error:
            WorkflowExecutionLog.objects.create(
                workflow=workflow,
                event_type=event_type,
                payload=payload,
                status='failed',
                error_message=str(error),
            )
        else:
            WorkflowExecutionLog.objects.create(
                workflow=workflow,
                event_type=event_type,
                payload=payload,
                status='success',
            )
