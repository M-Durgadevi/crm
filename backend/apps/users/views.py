from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import MyTokenObtainPairSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def current_user(request):
    if request.method == 'PATCH':
        for field in ('first_name', 'last_name'):
            if field in request.data:
                setattr(request.user, field, str(request.data[field]).strip())
        request.user.save(update_fields=['first_name', 'last_name'])
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    if not request.user.check_password(current_password):
        return Response({'current_password': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        password_validation.validate_password(new_password, request.user)
    except ValidationError as error:
        return Response({'new_password': list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])
    return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_members(request):
    if request.user.role == 'employee':
        return Response(UserSerializer([request.user], many=True).data, status=status.HTTP_200_OK)
    members = User.objects.filter(is_active=True).order_by('first_name', 'last_name', 'email')
    return Response(UserSerializer(members, many=True).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_team_member(request):
    if request.user.role != 'admin':
        return Response({'detail': 'Only administrators can create team members.'}, status=status.HTTP_403_FORBIDDEN)

    email = str(request.data.get('email', '')).strip().lower()
    password = request.data.get('password', '')
    username = str(request.data.get('username', '')).strip()
    role = request.data.get('role', 'employee')
    if not email or not password or not username:
        return Response({'detail': 'Email, username, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if role not in dict(User.ROLE_CHOICES):
        return Response({'role': 'Choose a valid CRM role.'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username=username).exists():
        return Response({'detail': 'Email or username is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        password_validation.validate_password(password)
    except ValidationError as error:
        return Response({'password': list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=str(request.data.get('first_name', '')).strip(),
        last_name=str(request.data.get('last_name', '')).strip(),
        role=role,
        is_staff=role == 'admin',
        is_superuser=role == 'admin',
    )
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
