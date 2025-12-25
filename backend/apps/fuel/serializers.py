from decimal import Decimal

from rest_framework import serializers

from apps.core.serializers import (
    CostCenterListSerializer,
    DriverListSerializer,
    FuelStationListSerializer,
    VehicleListSerializer,
)

from apps.core.models import FuelType

from .models import FuelPriceSnapshot, FuelTransaction


class FuelTransactionSerializer(serializers.ModelSerializer):
    vehicle_detail = VehicleListSerializer(source='vehicle', read_only=True)
    driver_detail = DriverListSerializer(source='driver', read_only=True)
    station_detail = FuelStationListSerializer(source='station', read_only=True)
    cost_center_detail = CostCenterListSerializer(source='cost_center', read_only=True)
    km_per_liter = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )
    fuel_type_display = serializers.CharField(
        source='get_fuel_type_display',
        read_only=True
    )

    class Meta:
        model = FuelTransaction
        fields = [
            'id', 'vehicle', 'vehicle_detail', 'driver', 'driver_detail',
            'station', 'station_detail', 'cost_center', 'cost_center_detail',
            'purchased_at', 'liters', 'unit_price', 'total_cost',
            'odometer_km', 'fuel_type', 'fuel_type_display', 'notes',
            'attachment', 'km_per_liter', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_cost', 'created_at', 'updated_at']

    def validate(self, data):
        """Validate transaction data."""
        liters = data.get('liters')
        odometer_km = data.get('odometer_km')

        # Validate liters is positive
        if liters and liters <= 0:
            raise serializers.ValidationError({
                'liters': 'Litros deve ser maior que zero.'
            })

        # Validate unit_price is positive
        unit_price = data.get('unit_price')
        if unit_price and unit_price <= 0:
            raise serializers.ValidationError({
                'unit_price': 'Preço por litro deve ser maior que zero.'
            })

        # Validate odometer is positive
        if odometer_km and odometer_km <= 0:
            raise serializers.ValidationError({
                'odometer_km': 'Odômetro deve ser maior que zero.'
            })

        return data


class FuelTransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating fuel transactions with validation."""

    class Meta:
        model = FuelTransaction
        fields = [
            'vehicle', 'driver', 'station', 'cost_center',
            'purchased_at', 'liters', 'unit_price', 'odometer_km',
            'fuel_type', 'notes', 'attachment'
        ]

    def validate_liters(self, value):
        if value <= 0:
            raise serializers.ValidationError('Litros deve ser maior que zero.')
        return value

    def validate_unit_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Preço por litro deve ser maior que zero.')
        return value

    def validate_odometer_km(self, value):
        if value <= 0:
            raise serializers.ValidationError('Odômetro deve ser maior que zero.')
        return value

    def create(self, validated_data):
        # Calculate total_cost
        liters = validated_data['liters']
        unit_price = validated_data['unit_price']
        validated_data['total_cost'] = liters * unit_price
        return super().create(validated_data)


class FuelTransactionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for transaction lists."""
    vehicle_name = serializers.CharField(source='vehicle.name', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.plate', read_only=True)
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    station_name = serializers.CharField(source='station.name', read_only=True)
    cost_center_name = serializers.CharField(source='cost_center.name', read_only=True)

    class Meta:
        model = FuelTransaction
        fields = [
            'id', 'vehicle', 'vehicle_name', 'vehicle_plate',
            'driver_name', 'station_name', 'cost_center_name',
            'purchased_at', 'liters', 'unit_price', 'total_cost',
            'odometer_km', 'fuel_type'
        ]


class FuelPriceSnapshotSerializer(serializers.ModelSerializer):
    fuel_type_display = serializers.CharField(
        source='get_fuel_type_display',
        read_only=True
    )
    station_detail = FuelStationListSerializer(source='station', read_only=True)

    class Meta:
        model = FuelPriceSnapshot
        fields = [
            'id', 'fuel_type', 'fuel_type_display', 'station',
            'station_detail', 'price_per_liter', 'collected_at',
            'source', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LatestPriceSerializer(serializers.Serializer):
    """Serializer for latest fuel price response."""
    fuel_type = serializers.CharField()
    price_per_liter = serializers.DecimalField(max_digits=8, decimal_places=4)
    collected_at = serializers.DateTimeField()
    source = serializers.CharField()
    station_id = serializers.UUIDField(allow_null=True)
    station_name = serializers.CharField(allow_null=True)


class NationalFuelPriceUpsertSerializer(serializers.Serializer):
    fuel_type = serializers.ChoiceField(choices=FuelType.choices)
    price_per_liter = serializers.DecimalField(
        max_digits=8,
        decimal_places=4,
        min_value=Decimal('0.0001')
    )
    collected_at = serializers.DateTimeField(required=False)
