from rest_framework import serializers

from apps.core.serializers import VehicleListSerializer

from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    vehicle_detail = VehicleListSerializer(source='vehicle', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    is_resolved = serializers.BooleanField(read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'vehicle', 'vehicle_detail', 'fuel_transaction',
            'type', 'type_display', 'severity', 'severity_display',
            'message', 'is_resolved', 'resolved_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AlertListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for alert lists."""
    vehicle_name = serializers.CharField(source='vehicle.name', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'vehicle', 'vehicle_name', 'type', 'type_display',
            'severity', 'severity_display', 'message', 'resolved_at', 'created_at'
        ]
