from django.utils import timezone
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiTypes, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.audit import AuditMixin
from apps.users.permissions import IsAdminUser
from apps.core.realtime import publish_event

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


@extend_schema_view(
    list=extend_schema(
        tags=['alerts'],
        summary='Listar alertas',
        description='Retorna lista de alertas com filtros opcionais.',
        parameters=[
            OpenApiParameter('from_date', OpenApiTypes.DATE, description='Data inicial'),
            OpenApiParameter('to_date', OpenApiTypes.DATE, description='Data final'),
            OpenApiParameter('vehicle', OpenApiTypes.UUID, description='ID do veículo'),
            OpenApiParameter('type', OpenApiTypes.STR, description='Tipo (ODOMETER_REGRESSION, LITERS_OVER_TANK, OUTLIER_CONSUMPTION, PERSONAL_USAGE)'),
            OpenApiParameter('severity', OpenApiTypes.STR, description='Severidade (INFO, WARN, CRITICAL)'),
            OpenApiParameter('resolved', OpenApiTypes.BOOL, description='Filtrar por status de resolução'),
        ],
    ),
    retrieve=extend_schema(tags=['alerts'], summary='Detalhes do alerta', description='Retorna detalhes de um alerta.'),
    create=extend_schema(tags=['alerts'], summary='Criar alerta', description='Cria um novo alerta manualmente.'),
    update=extend_schema(tags=['alerts'], summary='Atualizar alerta', description='Atualiza um alerta.'),
    partial_update=extend_schema(tags=['alerts'], summary='Atualizar parcialmente', description='Atualiza parcialmente um alerta.'),
    destroy=extend_schema(tags=['alerts'], summary='Excluir alerta', description='Remove um alerta.'),
)
class AlertViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet para gerenciamento de alertas de inconsistência."""
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

    @extend_schema(
        tags=['alerts'],
        summary='Resolver alerta',
        description='Marca um alerta como resolvido.',
        request=None,
        responses={200: AlertSerializer},
    )
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
        publish_event({
            'type': 'ALERT_RESOLVED',
            'alert_id': str(alert.id),
            'vehicle_id': str(alert.vehicle_id),
        })
        serializer = AlertSerializer(alert)
        return Response(serializer.data)

    @extend_schema(
        tags=['alerts'],
        summary='Resolver alertas em lote',
        description='Resolve múltiplos alertas de uma vez.',
        request=inline_serializer(
            name='BulkResolveRequest',
            fields={'ids': drf_serializers.ListField(child=drf_serializers.UUIDField())}
        ),
        responses={
            200: inline_serializer(
                name='BulkResolveResponse',
                fields={
                    'message': drf_serializers.CharField(),
                    'count': drf_serializers.IntegerField(),
                }
            ),
        }
    )
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

        if updated:
            publish_event({
                'type': 'ALERT_RESOLVED_BULK',
                'alert_count': updated,
            })

        return Response({
            'message': f'{updated} alerts resolved',
            'count': updated
        })

    @extend_schema(
        tags=['alerts'],
        summary='Alertas abertos',
        description='Retorna apenas alertas não resolvidos.',
    )
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
