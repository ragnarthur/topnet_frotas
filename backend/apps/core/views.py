import json

import redis
from django.conf import settings
from django.http import HttpResponseForbidden, HttpResponseServerError, StreamingHttpResponse
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiTypes
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.users.permissions import IsAdminOrDriver, IsAdminUser

from .audit import AuditMixin
from .models import AuditLog, CostCenter, Driver, FuelStation, Vehicle
from .serializers import (
    AuditLogSerializer,
    CostCenterListSerializer,
    CostCenterSerializer,
    DriverListSerializer,
    DriverSerializer,
    FuelStationListSerializer,
    FuelStationSerializer,
    VehicleListSerializer,
    VehicleSerializer,
)


class AuditLogFilter(filters.FilterSet):
    from_date = filters.DateFilter(field_name='timestamp', lookup_expr='date__gte')
    to_date = filters.DateFilter(field_name='timestamp', lookup_expr='date__lte')
    action = filters.CharFilter()
    entity_type = filters.CharFilter(lookup_expr='iexact')
    entity_id = filters.CharFilter()
    username = filters.CharFilter(field_name='username', lookup_expr='icontains')
    user = filters.NumberFilter(field_name='user__id')

    class Meta:
        model = AuditLog
        fields = ['action', 'entity_type', 'entity_id', 'username', 'user']


class VehicleFilter(filters.FilterSet):
    fuel_type = filters.CharFilter()
    usage_category = filters.CharFilter()
    active = filters.BooleanFilter()

    class Meta:
        model = Vehicle
        fields = ['fuel_type', 'usage_category', 'active']


@extend_schema_view(
    list=extend_schema(tags=['vehicles'], summary='Listar veículos', description='Retorna lista de veículos. Motoristas veem apenas seu veículo atual.'),
    create=extend_schema(tags=['vehicles'], summary='Cadastrar veículo', description='Cadastra novo veículo. Apenas administradores.'),
    retrieve=extend_schema(tags=['vehicles'], summary='Detalhes do veículo', description='Retorna detalhes de um veículo.'),
    update=extend_schema(tags=['vehicles'], summary='Atualizar veículo', description='Atualiza um veículo. Apenas administradores.'),
    partial_update=extend_schema(tags=['vehicles'], summary='Atualizar parcialmente', description='Atualiza parcialmente um veículo. Apenas administradores.'),
    destroy=extend_schema(tags=['vehicles'], summary='Excluir veículo', description='Remove um veículo. Apenas administradores.'),
)
class VehicleViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet para gerenciamento de veículos da frota."""
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAdminOrDriver]
    filterset_class = VehicleFilter
    search_fields = ['name', 'plate', 'model']
    ordering_fields = ['name', 'plate', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        return VehicleSerializer

    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied('Somente administradores podem cadastrar veículos.')
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied('Somente administradores podem editar veículos.')
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied('Somente administradores podem excluir veículos.')
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.is_staff:
            return queryset

        driver = getattr(user, 'driver_profile', None)
        if driver and driver.current_vehicle_id:
            return queryset.filter(id=driver.current_vehicle_id)

        return queryset.none()

    @extend_schema(tags=['vehicles'], summary='Veículos ativos', description='Retorna apenas veículos ativos (para dropdowns).')
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Return only active vehicles (for dropdowns)."""
        vehicles = self.get_queryset().filter(active=True).order_by('name')
        serializer = VehicleListSerializer(vehicles, many=True)
        return Response(serializer.data)


class DriverFilter(filters.FilterSet):
    active = filters.BooleanFilter()

    class Meta:
        model = Driver
        fields = ['active']


@extend_schema_view(
    list=extend_schema(tags=['drivers'], summary='Listar motoristas', description='Retorna lista de motoristas cadastrados.'),
    create=extend_schema(tags=['drivers'], summary='Cadastrar motorista', description='Cadastra novo motorista.'),
    retrieve=extend_schema(tags=['drivers'], summary='Detalhes do motorista', description='Retorna detalhes de um motorista.'),
    update=extend_schema(tags=['drivers'], summary='Atualizar motorista', description='Atualiza dados de um motorista.'),
    partial_update=extend_schema(tags=['drivers'], summary='Atualizar parcialmente', description='Atualiza parcialmente um motorista.'),
    destroy=extend_schema(tags=['drivers'], summary='Excluir motorista', description='Remove um motorista.'),
)
class DriverViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet para gerenciamento de motoristas."""
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAdminUser]
    filterset_class = DriverFilter
    search_fields = ['name', 'doc_id']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return DriverListSerializer
        return DriverSerializer

    @extend_schema(tags=['drivers'], summary='Motoristas ativos', description='Retorna apenas motoristas ativos (para dropdowns).')
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Return only active drivers (for dropdowns)."""
        drivers = Driver.objects.filter(active=True).order_by('name')
        serializer = DriverListSerializer(drivers, many=True)
        return Response(serializer.data)


class CostCenterFilter(filters.FilterSet):
    category = filters.CharFilter()
    active = filters.BooleanFilter()

    class Meta:
        model = CostCenter
        fields = ['category', 'active']


@extend_schema_view(
    list=extend_schema(tags=['cost-centers'], summary='Listar centros de custo', description='Retorna lista de centros de custo.'),
    create=extend_schema(tags=['cost-centers'], summary='Cadastrar centro de custo', description='Cadastra novo centro de custo.'),
    retrieve=extend_schema(tags=['cost-centers'], summary='Detalhes do centro de custo', description='Retorna detalhes de um centro de custo.'),
    update=extend_schema(tags=['cost-centers'], summary='Atualizar centro de custo', description='Atualiza um centro de custo.'),
    partial_update=extend_schema(tags=['cost-centers'], summary='Atualizar parcialmente', description='Atualiza parcialmente um centro de custo.'),
    destroy=extend_schema(tags=['cost-centers'], summary='Excluir centro de custo', description='Remove um centro de custo.'),
)
class CostCenterViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet para gerenciamento de centros de custo."""
    queryset = CostCenter.objects.all()
    serializer_class = CostCenterSerializer
    permission_classes = [IsAdminUser]
    filterset_class = CostCenterFilter
    search_fields = ['name']
    ordering_fields = ['name', 'category', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return CostCenterListSerializer
        return CostCenterSerializer

    @extend_schema(tags=['cost-centers'], summary='Centros de custo ativos', description='Retorna apenas centros de custo ativos (para dropdowns).')
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Return only active cost centers (for dropdowns)."""
        cost_centers = CostCenter.objects.filter(active=True).order_by('name')
        serializer = CostCenterListSerializer(cost_centers, many=True)
        return Response(serializer.data)


class FuelStationFilter(filters.FilterSet):
    city = filters.CharFilter(lookup_expr='icontains')
    active = filters.BooleanFilter()

    class Meta:
        model = FuelStation
        fields = ['city', 'active']


@extend_schema_view(
    list=extend_schema(tags=['fuel-stations'], summary='Listar postos', description='Retorna lista de postos de combustível.'),
    create=extend_schema(tags=['fuel-stations'], summary='Cadastrar posto', description='Cadastra novo posto de combustível.'),
    retrieve=extend_schema(tags=['fuel-stations'], summary='Detalhes do posto', description='Retorna detalhes de um posto.'),
    update=extend_schema(tags=['fuel-stations'], summary='Atualizar posto', description='Atualiza um posto.'),
    partial_update=extend_schema(tags=['fuel-stations'], summary='Atualizar parcialmente', description='Atualiza parcialmente um posto.'),
    destroy=extend_schema(tags=['fuel-stations'], summary='Excluir posto', description='Remove um posto.'),
)
class FuelStationViewSet(AuditMixin, viewsets.ModelViewSet):
    """ViewSet para gerenciamento de postos de combustível."""
    queryset = FuelStation.objects.all()
    serializer_class = FuelStationSerializer
    permission_classes = [IsAdminUser]
    filterset_class = FuelStationFilter
    search_fields = ['name', 'city', 'address']
    ordering_fields = ['name', 'city', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return FuelStationListSerializer
        return FuelStationSerializer

    @extend_schema(tags=['fuel-stations'], summary='Postos ativos', description='Retorna apenas postos ativos (para dropdowns).')
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Return only active fuel stations (for dropdowns)."""
        stations = FuelStation.objects.filter(active=True).order_by('name')
        serializer = FuelStationListSerializer(stations, many=True)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        tags=['audit'],
        summary='Listar logs de auditoria',
        description='Retorna histórico de alterações no sistema.',
        parameters=[
            OpenApiParameter('from_date', OpenApiTypes.DATE, description='Data inicial'),
            OpenApiParameter('to_date', OpenApiTypes.DATE, description='Data final'),
            OpenApiParameter('action', OpenApiTypes.STR, description='Tipo de ação (CREATE, UPDATE, DELETE)'),
            OpenApiParameter('entity_type', OpenApiTypes.STR, description='Tipo de entidade'),
            OpenApiParameter('entity_id', OpenApiTypes.STR, description='ID da entidade'),
            OpenApiParameter('username', OpenApiTypes.STR, description='Nome do usuário'),
        ],
    ),
    retrieve=extend_schema(tags=['audit'], summary='Detalhes do log', description='Retorna detalhes de um registro de auditoria.'),
)
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consulta de logs de auditoria."""
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    filterset_class = AuditLogFilter
    search_fields = ['username', 'entity_type', 'entity_description', 'entity_id', 'ip_address']
    ordering_fields = ['timestamp', 'action', 'entity_type', 'username']
    ordering = ['-timestamp']


def _get_user_from_token(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    token = None
    if auth_header.lower().startswith('bearer '):
        token = auth_header.split(' ', 1)[1]
    if not token:
        token = request.GET.get('token')
    if not token:
        return None

    auth = JWTAuthentication()
    try:
        validated = auth.get_validated_token(token)
        return auth.get_user(validated)
    except Exception:
        return None


def event_stream(request):
    user = _get_user_from_token(request)
    if not user or not user.is_staff:
        return HttpResponseForbidden('Admin only')

    redis_url = getattr(settings, 'REDIS_URL', None) or settings.CELERY_BROKER_URL
    channel = getattr(settings, 'REDIS_PUBSUB_CHANNEL', 'topnet.frotas.events')

    try:
        client = redis.from_url(redis_url)
        pubsub = client.pubsub()
        pubsub.subscribe(channel)
    except Exception:
        return HttpResponseServerError('Redis unavailable')

    def stream():
        try:
            yield "retry: 2000\n\n"
            while True:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=15)
                if message:
                    payload = message.get('data')
                    if isinstance(payload, bytes):
                        payload = payload.decode('utf-8')
                    if not isinstance(payload, str):
                        payload = json.dumps(payload)
                    yield f"data: {payload}\n\n"
                else:
                    yield ": keep-alive\n\n"
        finally:
            pubsub.close()

    response = StreamingHttpResponse(stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
