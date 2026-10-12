from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    ActivityViewSet,
    ContactViewSet,
    CustomerFeedbackViewSet,
    CustomerRequestViewSet,
    DealViewSet,
    LeadViewSet,
    NotificationViewSet,
    ProjectViewSet,
    SalesResourceViewSet,
    ServiceViewSet,
    TaskViewSet,
    WorkflowExecutionLogViewSet,
    WorkflowViewSet,
    dashboard_summary,
    crm_reports,
    global_search,
    mark_all_notifications_read,
    mark_notification_read,
)

router = DefaultRouter()
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'deals', DealViewSet, basename='deal')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'requests', CustomerRequestViewSet, basename='customer-request')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'feedback', CustomerFeedbackViewSet, basename='customer-feedback')
router.register(r'sales-resources', SalesResourceViewSet, basename='sales-resource')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'workflows', WorkflowViewSet, basename='workflow')
router.register(r'workflow-logs', WorkflowExecutionLogViewSet, basename='workflow-log')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_summary, name='dashboard-summary'),
    path('search/', global_search, name='global-search'),
    path('reports/', crm_reports, name='crm-reports'),
    path('notifications/<int:pk>/read/', mark_notification_read, name='notification-read'),
    path('notifications/read-all/', mark_all_notifications_read, name='notification-read-all'),
]
