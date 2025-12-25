import json

import redis
from django.conf import settings
from django.http import HttpResponseForbidden, HttpResponseServerError, StreamingHttpResponse
from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.users.permissions import IsAdminOrDriver, IsAdminUser

from .models import CostCenter, Driver, FuelStation, Vehicle
from .serializers import (
    CostCenterListSerializer,
    CostCenterSerializer,
    DriverListSerializer,
    DriverSerializer,
    FuelStationListSerializer,
    FuelStationSerializer,
    VehicleListSerializer,
    VehicleSerializer,
)


class VehicleFilter(filters.FilterSet):
    fuel_type = filters.CharFilter()
    usage_category = filters.CharFilter()
    active = filters.BooleanFilter()

    class Meta:
        model = Vehicle
        fields = ['fuel_type', 'usage_category', 'active']


class VehicleViewSet(viewsets.ModelViewSet):
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


class DriverViewSet(viewsets.ModelViewSet):
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


class CostCenterViewSet(viewsets.ModelViewSet):
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


class FuelStationViewSet(viewsets.ModelViewSet):
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

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Return only active fuel stations (for dropdowns)."""
        stations = FuelStation.objects.filter(active=True).order_by('name')
        serializer = FuelStationListSerializer(stations, many=True)
        return Response(serializer.data)


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
