"""
Custom permission classes for role-based access control.

Roles:
- Admin (is_staff=True): Full access to everything
- Driver (has driver_profile): Limited access to own data
"""
from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Allow access only to admin users (is_staff=True).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsDriver(BasePermission):
    """
    Allow access only to users with a driver profile.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'driver_profile') and
            request.user.driver_profile is not None
        )


class IsAdminOrDriver(BasePermission):
    """
    Allow access to both admin users and drivers.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Admin has full access
        if request.user.is_staff:
            return True

        # Driver has access
        if hasattr(request.user, 'driver_profile') and request.user.driver_profile is not None:
            return True

        return False


class IsAdminOrReadOnly(BasePermission):
    """
    Allow full access to admins, read-only for others.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Admin has full access
        if request.user.is_staff:
            return True

        # Others can only read
        return request.method in ('GET', 'HEAD', 'OPTIONS')


def get_user_role(user):
    """
    Get the role of a user.
    Returns: 'admin', 'driver', or None
    """
    if not user or not user.is_authenticated:
        return None

    if user.is_staff:
        return 'admin'

    if hasattr(user, 'driver_profile') and user.driver_profile is not None:
        return 'driver'

    return None
