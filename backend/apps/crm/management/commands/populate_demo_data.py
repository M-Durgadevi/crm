from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.crm.models import Account, Activity, Contact, Deal, Lead, Notification, Task
from apps.users.models import User


class Command(BaseCommand):
    help = 'Populate demo CRM data for local development.'

    def handle(self, *args, **options):
        admin_user, _ = User.objects.get_or_create(
            email='admin@crms.local',
            defaults={
                'username': 'admincrms',
                'first_name': 'CRMS',
                'last_name': 'Admin',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
        )
        admin_user.set_password('Admin@123')
        admin_user.save()

        employee, _ = User.objects.get_or_create(
            email='employee@crms.local',
            defaults={
                'username': 'employeecrms',
                'first_name': 'Maria',
                'last_name': 'Lopez',
                'role': 'employee',
            },
        )
        employee.set_password('Employee@123')
        employee.save()

        manager, _ = User.objects.get_or_create(
            email='manager@crms.local',
            defaults={
                'username': 'managercrms',
                'first_name': 'Daniel',
                'last_name': 'Brown',
                'role': 'manager',
            },
        )
        manager.set_password('Manager@123')
        manager.save()

        lead1 = Lead.objects.get_or_create(
            email='jane.smith@northwind.io',
            defaults={
                'first_name': 'Jane',
                'last_name': 'Smith',
                'company': 'Northwind Labs',
                'phone': '+1 555 102 8080',
                'lead_source': 'website',
                'status': 'qualified',
                'industry': 'Technology',
                'designation': 'Operations Director',
                'assigned_to': manager,
                'notes': 'Interested in enterprise automation.',
            },
        )[0]

        lead2 = Lead.objects.get_or_create(
            email='michael.lee@bluepeak.com',
            defaults={
                'first_name': 'Michael',
                'last_name': 'Lee',
                'company': 'BluePeak',
                'phone': '+1 555 245 9998',
                'lead_source': 'referral',
                'status': 'new',
                'industry': 'Finance',
                'designation': 'VP Sales',
                'assigned_to': employee,
            },
        )[0]

        account1, _ = Account.objects.get_or_create(
            name='Northwind Labs',
            defaults={
                'website': 'https://northwindlabs.io',
                'industry': 'Technology',
                'phone': '+1 555 020 4000',
                'email': 'info@northwindlabs.io',
                'billing_address': '1250 Market St, San Francisco, CA',
                'description': 'AI workflow platform.',
                'assigned_to': manager,
            },
        )

        contact1, _ = Contact.objects.get_or_create(
            email='jane.smith@northwind.io',
            defaults={
                'first_name': 'Jane',
                'last_name': 'Smith',
                'phone': '+1 555 102 8080',
                'job_title': 'Operations Director',
                'account': account1,
                'assigned_to': manager,
                'notes': 'Key budget holder.',
            },
        )

        deal1, _ = Deal.objects.get_or_create(
            name='Northwind Labs Expansion',
            defaults={
                'account': account1,
                'contact': contact1,
                'amount': 28000,
                'stage': 'proposal',
                'probability': 68,
                'expected_closing_date': timezone.now().date(),
                'assigned_to': manager,
                'description': 'Multi-region CRM rollout.',
            },
        )

        Task.objects.get_or_create(
            title='Follow up with Northwind',
            defaults={
                'description': 'Send pricing and next steps.',
                'assigned_to': employee,
                'related_model': 'lead',
                'related_id': lead1.id,
                'priority': 'high',
                'status': 'pending',
                'due_date': timezone.now().date(),
            },
        )

        Task.objects.get_or_create(
            title='Prepare contract review',
            defaults={
                'description': 'Review commercial terms with the legal team.',
                'assigned_to': manager,
                'related_model': 'deal',
                'related_id': deal1.id,
                'priority': 'medium',
                'status': 'in_progress',
                'due_date': timezone.now().date(),
            },
        )

        Notification.objects.get_or_create(
            recipient=employee,
            title='New lead assigned',
            defaults={
                'message': 'A new lead was assigned to you.',
                'notification_type': 'task',
                'related_model': 'lead',
                'related_id': lead2.id,
            },
        )

        Activity.objects.get_or_create(
            subject='Discovery call',
            defaults={
                'activity_type': 'call',
                'description': 'Discussed the rollout plan and timeline.',
                'related_model': 'lead',
                'related_id': lead1.id,
                'assigned_to': manager,
                'scheduled_at': timezone.now(),
                'completed': True,
            },
        )

        self.stdout.write(self.style.SUCCESS('Demo CRM seed data created successfully.'))
