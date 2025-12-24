from django.contrib import admin

from .models import CostCenter, Driver, FuelStation, Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['name', 'plate', 'fuel_type', 'usage_category', 'active']
    list_filter = ['fuel_type', 'usage_category', 'active']
    search_fields = ['name', 'plate', 'model']
    ordering = ['name']


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['name', 'doc_id', 'phone', 'active']
    list_filter = ['active']
    search_fields = ['name', 'doc_id']
    ordering = ['name']


@admin.register(CostCenter)
class CostCenterAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'active']
    list_filter = ['category', 'active']
    search_fields = ['name']
    ordering = ['name']


@admin.register(FuelStation)
class FuelStationAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'active']
    list_filter = ['active', 'city']
    search_fields = ['name', 'city', 'address']
    ordering = ['name']
