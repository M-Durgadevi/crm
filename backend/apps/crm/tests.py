from django.test import SimpleTestCase

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
