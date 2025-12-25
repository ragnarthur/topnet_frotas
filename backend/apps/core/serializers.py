from rest_framework import serializers

from .models import CostCenter, Driver, FuelStation, Vehicle
from .utils import sanitize_text_field


class SanitizedCharField(serializers.CharField):
    """CharField that sanitizes input to prevent XSS."""

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return sanitize_text_field(value)


class VehicleSerializer(serializers.ModelSerializer):
    name = SanitizedCharField(max_length=100)
    model = SanitizedCharField(max_length=100)
    last_odometer = serializers.IntegerField(read_only=True)
    usage_category_display = serializers.CharField(
        source='get_usage_category_display',
        read_only=True
    )
    fuel_type_display = serializers.CharField(
        source='get_fuel_type_display',
        read_only=True
    )

    class Meta:
        model = Vehicle
        fields = [
            'id', 'plate', 'name', 'model', 'fuel_type', 'fuel_type_display',
            'tank_capacity_liters', 'usage_category', 'usage_category_display',
            'min_expected_km_per_liter', 'max_expected_km_per_liter',
            'active', 'last_odometer', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehicleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists and dropdowns."""
    usage_category_display = serializers.CharField(
        source='get_usage_category_display',
        read_only=True
    )

    class Meta:
        model = Vehicle
        fields = ['id', 'plate', 'name', 'fuel_type', 'usage_category', 'usage_category_display', 'active']


class DriverSerializer(serializers.ModelSerializer):
    name = SanitizedCharField(max_length=200)
    current_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        required=False,
        allow_null=True
    )
    current_vehicle_detail = VehicleListSerializer(source='current_vehicle', read_only=True)

    class Meta:
        model = Driver
        fields = [
            'id', 'name', 'doc_id', 'phone', 'active',
            'current_vehicle', 'current_vehicle_detail',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DriverListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists and dropdowns."""
    current_vehicle = serializers.PrimaryKeyRelatedField(read_only=True)
    current_vehicle_detail = VehicleListSerializer(source='current_vehicle', read_only=True)

    class Meta:
        model = Driver
        fields = ['id', 'name', 'doc_id', 'phone', 'active', 'current_vehicle', 'current_vehicle_detail']


class CostCenterSerializer(serializers.ModelSerializer):
    name = SanitizedCharField(max_length=100)
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )

    class Meta:
        model = CostCenter
        fields = ['id', 'name', 'category', 'category_display', 'active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CostCenterListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists and dropdowns."""
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )

    class Meta:
        model = CostCenter
        fields = ['id', 'name', 'category', 'category_display', 'active']


class FuelStationSerializer(serializers.ModelSerializer):
    name = SanitizedCharField(max_length=200)
    city = SanitizedCharField(max_length=100, required=False, allow_blank=True)
    address = SanitizedCharField(max_length=300, required=False, allow_blank=True)

    class Meta:
        model = FuelStation
        fields = ['id', 'name', 'city', 'address', 'active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class FuelStationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists and dropdowns."""
    class Meta:
        model = FuelStation
        fields = ['id', 'name', 'city', 'address', 'active']
