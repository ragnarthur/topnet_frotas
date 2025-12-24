from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardSummaryView,
    FuelPriceSnapshotViewSet,
    FuelTransactionViewSet,
    LatestFuelPriceView,
)

router = DefaultRouter()
router.register('fuel-transactions', FuelTransactionViewSet, basename='fuel-transaction')
router.register('fuel-prices', FuelPriceSnapshotViewSet, basename='fuel-price')

urlpatterns = [
    path('', include(router.urls)),
    path('fuel-prices/latest/', LatestFuelPriceView.as_view(), name='latest-fuel-price'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
]
