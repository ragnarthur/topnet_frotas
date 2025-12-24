from django.contrib import admin

from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'type', 'severity', 'created_at', 'resolved_at']
    list_filter = ['type', 'severity', 'resolved_at', 'vehicle']
    search_fields = ['vehicle__name', 'vehicle__plate', 'message']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
