from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CostCenterViewSet,
    DriverViewSet,
    FuelStationViewSet,
    VehicleViewSet,
    event_stream,
)

router = DefaultRouter()
router.register('vehicles', VehicleViewSet, basename='vehicle')
router.register('drivers', DriverViewSet, basename='driver')
router.register('cost-centers', CostCenterViewSet, basename='cost-center')
router.register('fuel-stations', FuelStationViewSet, basename='fuel-station')

urlpatterns = [
    path('events/stream/', event_stream, name='event-stream'),
    path('', include(router.urls)),
]
