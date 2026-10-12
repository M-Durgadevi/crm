from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crm.models import Task, Workflow, WorkflowExecutionLog
from apps.crm.workflow_engine import run_workflows


class Command(BaseCommand):
    help = 'Run enabled task_overdue workflows once for each overdue task.'

    def handle(self, *args, **options):
        today = timezone.localdate()
        tasks = Task.objects.filter(
            status__in=['pending', 'in_progress'],
            due_date__lt=today,
        ).select_related('assigned_to')
        processed = 0
        for task in tasks.iterator():
            if not Workflow.objects.filter(enabled=True, trigger_event='task_overdue').exists():
                break
            already_processed = WorkflowExecutionLog.objects.filter(
                event_type='task_overdue',
                payload__record_id=task.pk,
            ).exists()
            if already_processed:
                continue
            run_workflows('task_overdue', task, task.assigned_to)
            processed += 1
        self.stdout.write(self.style.SUCCESS(f'Processed overdue task workflows for {processed} task(s).'))
