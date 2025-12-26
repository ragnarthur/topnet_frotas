from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardSummaryView,
    DriverDashboardView,
    FetchANPPricesView,
    FuelPriceSnapshotViewSet,
    FuelTransactionViewSet,
    FuelTransactionsExportView,
    FuelTransactionsImportFormatView,
    FuelTransactionsImportTemplateView,
    FuelTransactionsImportView,
    LatestFuelPriceView,
    NationalFuelPriceView,
)

router = DefaultRouter()
router.register('fuel-transactions', FuelTransactionViewSet, basename='fuel-transaction')
router.register('fuel-prices', FuelPriceSnapshotViewSet, basename='fuel-price')

urlpatterns = [
    path('fuel-prices/latest/', LatestFuelPriceView.as_view(), name='latest-fuel-price'),
    path('fuel-prices/national/', NationalFuelPriceView.as_view(), name='national-fuel-price'),
    path('fuel-prices/fetch-anp/', FetchANPPricesView.as_view(), name='fetch-anp-prices'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('dashboard/driver/', DriverDashboardView.as_view(), name='driver-dashboard'),
    path('reports/transactions/export/', FuelTransactionsExportView.as_view(), name='fuel-transactions-export'),
    path('import/transactions/', FuelTransactionsImportView.as_view(), name='fuel-transactions-import'),
    path('import/transactions/template/', FuelTransactionsImportTemplateView.as_view(), name='fuel-transactions-import-template'),
    path('import/transactions/format/', FuelTransactionsImportFormatView.as_view(), name='fuel-transactions-import-format'),
    path('', include(router.urls)),
]
