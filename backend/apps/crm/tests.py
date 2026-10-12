from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from .models import Lead
from .serializers import CustomerFeedbackSerializer, DealSerializer, WorkflowSerializer


class CRMValidationTests(SimpleTestCase):
    def test_workflow_rejects_unknown_triggers_and_actions(self):
        serializer = WorkflowSerializer(data={
            'name': 'Unsafe workflow',
            'trigger_event': 'execute_python',
            'actions': [{'type': 'run_code', 'code': 'print(1)'}],
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('trigger_event', serializer.errors)

    def test_workflow_bounds_follow_up_schedule(self):
        serializer = WorkflowSerializer(data={
            'name': 'Long follow up',
            'trigger_event': 'lead_created',
            'actions': [{'type': 'create_follow_up_task', 'title': 'Follow up', 'due_in_days': 366}],
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('actions', serializer.errors)

    def test_deal_rejects_negative_amount_and_probability_over_100(self):
        serializer = DealSerializer(data={
            'name': 'Invalid opportunity',
            'amount': '-1.00',
            'probability': 101,
        })

        self.assertFalse(serializer.is_valid())
        self.assertTrue({'amount', 'probability'}.intersection(serializer.errors))

    def test_feedback_rating_is_limited_to_one_through_five(self):
        serializer = CustomerFeedbackSerializer(data={
            'source': 'survey',
            'rating': 6,
            'category': 'Support',
            'comments': 'The response took too long.',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('rating', serializer.errors)


class LeadCsvImportTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username='lead-import-admin',
            email='lead-import-admin@example.com',
            password='TestPassword!482',
            role='admin',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def upload(self, filename, content):
        csv_file = SimpleUploadedFile(filename, content.encode('utf-8'), content_type='text/csv')
        return self.client.post('/api/crm/leads/import-csv/', {'file': csv_file}, format='multipart', HTTP_HOST='localhost')

    def test_imports_valid_rows_and_reports_invalid_and_duplicate_rows(self):
        content = (
            'first_name,last_name,company,email,lead_source,status\n'
            'Ada,Lovelace,Analytical Engines,ada@example.com,referral,new\n'
            'Invalid,Source,Example,invalid-status@example.com,unknown,new\n'
            'Duplicate,Email,Example,ada@example.com,website,new\n'
        )

        response = self.upload('leads.csv', content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['imported_count'], 1)
        self.assertEqual(response.data['failed_count'], 2)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(response.data['errors'][0]['row'], 3)
        self.assertEqual(response.data['errors'][1]['row'], 4)

    def test_rejects_csv_missing_required_headers(self):
        response = self.upload('leads.csv', 'first_name,email\nAda,ada@example.com\n')

        self.assertEqual(response.status_code, 400)
        self.assertIn('company', response.data['detail'])

    def test_rejects_non_csv_file(self):
        response = self.upload('leads.txt', 'first_name,last_name,company,email\n')

        self.assertEqual(response.status_code, 400)

    def test_rejects_more_than_500_rows_without_partial_import(self):
        rows = ['first_name,last_name,company,email']
        rows.extend(f'Lead{index},Example,Example Co,lead{index}@example.com' for index in range(501))

        response = self.upload('leads.csv', '\n'.join(rows))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)
