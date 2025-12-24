from rest_framework import serializers

from .models import CostCenter, Driver, FuelStation, Vehicle


class VehicleSerializer(serializers.ModelSerializer):
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
    class Meta:
        model = Driver
        fields = ['id', 'name', 'doc_id', 'phone', 'active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DriverListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists and dropdowns."""
    class Meta:
        model = Driver
        fields = ['id', 'name', 'active']


class CostCenterSerializer(serializers.ModelSerializer):
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
    class Meta:
        model = FuelStation
        fields = ['id', 'name', 'city', 'address', 'active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class FuelStationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists and dropdowns."""
    class Meta:
        model = FuelStation
        fields = ['id', 'name', 'city', 'active']
