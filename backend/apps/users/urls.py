from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, change_password, create_team_member, current_user, team_members

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', current_user, name='current-user'),
    path('change-password/', change_password, name='change-password'),
    path('team/', team_members, name='team-members'),
    path('team/create/', create_team_member, name='create-team-member'),
]
