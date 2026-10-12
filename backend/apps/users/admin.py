from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Roles', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Roles', {'fields': ('role',)}),
    )
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name')
