"""
Audit mixin for Django REST Framework ViewSets.
Automatically logs CREATE, UPDATE, and DELETE operations.
"""

import json
import uuid
from datetime import date, datetime
from decimal import Decimal

from .models import AuditAction, AuditLog


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _to_serializable(value):
    if isinstance(value, dict):
        return {key: _to_serializable(val) for key, val in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_serializable(item) for item in value]
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


def model_to_dict(instance, serializer_class=None):
    """Convert model instance to dict for audit logging."""
    if serializer_class:
        return _to_serializable(serializer_class(instance).data)

    # Fallback: basic field extraction
    data = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.name)
        # Convert non-serializable types
        if hasattr(value, 'pk'):
            value = str(value.pk)
        data[field.name] = _to_serializable(value)
    return data


class AuditMixin:
    """
    Mixin for DRF ViewSets to automatically log CREATE, UPDATE, DELETE operations.

    Usage:
        class VehicleViewSet(AuditMixin, viewsets.ModelViewSet):
            queryset = Vehicle.objects.all()
            serializer_class = VehicleSerializer
            audit_serializer_class = VehicleSerializer  # Optional, uses serializer_class by default
    """
    audit_serializer_class = None

    def get_audit_serializer_class(self):
        """Get serializer class for audit logging."""
        return getattr(self, 'audit_serializer_class', None) or self.get_serializer_class()

    def perform_create(self, serializer):
        """Log creation of new objects."""
        instance = serializer.save()
        audit_serializer = self.get_audit_serializer_class()
        new_data = model_to_dict(instance, audit_serializer)
        self._audit_log(AuditAction.CREATE, instance, new_data=new_data)
        return instance

    def perform_update(self, serializer):
        """Log updates to existing objects."""
        # Capture old data before update
        audit_serializer = self.get_audit_serializer_class()
        old_data = model_to_dict(serializer.instance, audit_serializer)

        instance = serializer.save()

        # Capture new data after update
        new_data = model_to_dict(instance, audit_serializer)

        self._audit_log(AuditAction.UPDATE, instance, old_data=old_data, new_data=new_data)

    def perform_destroy(self, instance):
        """Log deletion of objects."""
        audit_serializer = self.get_audit_serializer_class()
        old_data = model_to_dict(instance, audit_serializer)

        self._audit_log(AuditAction.DELETE, instance, old_data=old_data)
        instance.delete()

    def _audit_log(self, action, instance, old_data=None, new_data=None):
        """Create audit log entry."""
        try:
            user = self.request.user if self.request.user.is_authenticated else None
            ip_address = get_client_ip(self.request)

            AuditLog.log(
                user=user,
                action=action,
                entity=instance,
                old_data=old_data,
                new_data=new_data,
                ip_address=ip_address,
            )
        except Exception as e:
            # Don't let audit logging break the main operation
            import logging
            logging.getLogger(__name__).error(f"Audit logging failed: {e}")
