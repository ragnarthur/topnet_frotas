from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdminUser

from .models import Alert
from .serializers import AlertListSerializer, AlertSerializer


class AlertFilter(filters.FilterSet):
    from_date = filters.DateFilter(field_name='created_at', lookup_expr='gte')
    to_date = filters.DateFilter(field_name='created_at', lookup_expr='lte')
    vehicle = filters.UUIDFilter(field_name='vehicle__id')
    type = filters.CharFilter()
    severity = filters.CharFilter()
    resolved = filters.BooleanFilter(method='filter_resolved')

    def filter_resolved(self, queryset, name, value):
        if value:
            return queryset.filter(resolved_at__isnull=False)
        return queryset.filter(resolved_at__isnull=True)

    class Meta:
        model = Alert
        fields = ['vehicle', 'type', 'severity']


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.select_related('vehicle', 'fuel_transaction').all()
    permission_classes = [IsAdminUser]
    filterset_class = AlertFilter
    search_fields = ['vehicle__name', 'vehicle__plate', 'message']
    ordering_fields = ['created_at', 'severity', 'type']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return AlertListSerializer
        return AlertSerializer

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark an alert as resolved."""
        alert = self.get_object()
        if alert.resolved_at:
            return Response(
                {'message': 'Alert already resolved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        alert.resolve()
        serializer = AlertSerializer(alert)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def resolve_bulk(self, request):
        """Resolve multiple alerts at once."""
        alert_ids = request.data.get('ids', [])
        if not alert_ids:
            return Response(
                {'error': 'No alert IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated = Alert.objects.filter(
            id__in=alert_ids,
            resolved_at__isnull=True
        ).update(resolved_at=timezone.now())

        return Response({
            'message': f'{updated} alerts resolved',
            'count': updated
        })

    @action(detail=False, methods=['get'])
    def open(self, request):
        """Get all open (unresolved) alerts."""
        queryset = self.filter_queryset(
            self.get_queryset().filter(resolved_at__isnull=True)
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AlertListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = AlertListSerializer(queryset, many=True)
        return Response(serializer.data)
