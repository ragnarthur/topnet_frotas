from django.contrib import admin

from .models import FuelPriceSnapshot, FuelTransaction


@admin.register(FuelTransaction)
class FuelTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'vehicle', 'purchased_at', 'liters', 'unit_price',
        'total_cost', 'odometer_km', 'driver', 'station'
    ]
    list_filter = ['vehicle', 'fuel_type', 'station', 'cost_center', 'purchased_at']
    search_fields = ['vehicle__name', 'vehicle__plate', 'driver__name', 'station__name']
    date_hierarchy = 'purchased_at'
    ordering = ['-purchased_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FuelPriceSnapshot)
class FuelPriceSnapshotAdmin(admin.ModelAdmin):
    list_display = ['fuel_type', 'station', 'price_per_liter', 'collected_at', 'source']
    list_filter = ['fuel_type', 'source', 'station']
    search_fields = ['station__name']
    date_hierarchy = 'collected_at'
    ordering = ['-collected_at']
