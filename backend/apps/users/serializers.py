from django.contrib.auth import authenticate
from rest_framework import serializers, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'username')


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = RefreshToken.for_user(user)
        token['role'] = user.role
        token['email'] = user.email
        token['name'] = user.get_full_name() or user.email
        return token

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise AuthenticationFailed('Email and password are required.', code=status.HTTP_400_BAD_REQUEST)

        user = authenticate(email=email, password=password)
        if not user or not user.is_active:
            raise AuthenticationFailed('Invalid email or password.', code=status.HTTP_401_UNAUTHORIZED)

        refresh = self.get_token(user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data,
        }
        return data
