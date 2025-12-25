from datetime import datetime
from decimal import Decimal

from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.alerts.models import Alert
from apps.core.models import UsageCategory, Vehicle

from .models import FuelPriceSnapshot, FuelPriceSource, FuelTransaction
from .serializers import (
    FuelPriceSnapshotSerializer,
    FuelTransactionCreateSerializer,
    FuelTransactionListSerializer,
    FuelTransactionSerializer,
    LatestPriceSerializer,
)


class FuelTransactionFilter(filters.FilterSet):
    from_date = filters.DateFilter(field_name='purchased_at', lookup_expr='gte')
    to_date = filters.DateFilter(field_name='purchased_at', lookup_expr='lte')
    vehicle = filters.UUIDFilter(field_name='vehicle__id')
    driver = filters.UUIDFilter(field_name='driver__id')
    cost_center = filters.UUIDFilter(field_name='cost_center__id')
    station = filters.UUIDFilter(field_name='station__id')
    fuel_type = filters.CharFilter()

    class Meta:
        model = FuelTransaction
        fields = ['vehicle', 'driver', 'cost_center', 'station', 'fuel_type']


class FuelTransactionViewSet(viewsets.ModelViewSet):
    queryset = FuelTransaction.objects.select_related(
        'vehicle', 'driver', 'station', 'cost_center'
    ).all()
    filterset_class = FuelTransactionFilter
    search_fields = ['vehicle__name', 'vehicle__plate', 'notes']
    ordering_fields = ['purchased_at', 'total_cost', 'liters', 'odometer_km']
    ordering = ['-purchased_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return FuelTransactionListSerializer
        if self.action == 'create':
            return FuelTransactionCreateSerializer
        return FuelTransactionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        # Return full transaction data
        output_serializer = FuelTransactionSerializer(instance)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class FuelPriceSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FuelPriceSnapshot.objects.select_related('station').all()
    serializer_class = FuelPriceSnapshotSerializer
    filterset_fields = ['fuel_type', 'station', 'source']
    ordering = ['-collected_at']


class LatestFuelPriceView(APIView):
    """Get the latest fuel price for a given fuel type and optionally station."""

    def get(self, request):
        fuel_type = request.query_params.get('fuel_type')
        station_id = request.query_params.get('station_id')

        if not fuel_type:
            return Response(
                {'error': 'fuel_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try specific station first (pump price reference)
        if station_id:
            snapshot = FuelPriceSnapshot.objects.filter(
                fuel_type=fuel_type,
                station_id=station_id
            ).first()
            if snapshot:
                data = {
                    'fuel_type': snapshot.fuel_type,
                    'price_per_liter': snapshot.price_per_liter,
                    'collected_at': snapshot.collected_at,
                    'source': snapshot.source,
                    'station_id': snapshot.station_id,
                    'station_name': snapshot.station.name if snapshot.station else None,
                }
                return Response(data)

        # Prefer national average (external/manual) for global price
        snapshot = FuelPriceSnapshot.objects.filter(
            fuel_type=fuel_type,
            station__isnull=True,
            source__in=[FuelPriceSource.EXTERNAL_ANP, FuelPriceSource.MANUAL]
        ).first()

        if not snapshot:
            return Response(
                {'error': 'No national average price found for this fuel type'},
                status=status.HTTP_404_NOT_FOUND
            )

        data = {
            'fuel_type': snapshot.fuel_type,
            'price_per_liter': snapshot.price_per_liter,
            'collected_at': snapshot.collected_at,
            'source': snapshot.source,
            'station_id': snapshot.station_id,
            'station_name': snapshot.station.name if snapshot.station else None,
        }
        return Response(data)


class DashboardSummaryView(APIView):
    """Dashboard summary with costs, consumption and alerts."""

    def get(self, request):
        # Parse date filters
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        include_personal = request.query_params.get('include_personal', '0') == '1'

        # Default to current month
        if not from_date:
            today = timezone.now().date()
            from_date = today.replace(day=1)
        else:
            from_date = datetime.strptime(from_date, '%Y-%m-%d').date()

        if not to_date:
            to_date = timezone.now().date()
        else:
            to_date = datetime.strptime(to_date, '%Y-%m-%d').date()

        # Base queryset
        transactions = FuelTransaction.objects.filter(
            purchased_at__date__gte=from_date,
            purchased_at__date__lte=to_date
        )

        # Filter out personal vehicles if needed
        if not include_personal:
            transactions = transactions.exclude(
                vehicle__usage_category=UsageCategory.PERSONAL
            )

        # Total cost for period
        total_cost = transactions.aggregate(
            total=Sum('total_cost')
        )['total'] or Decimal('0.00')

        total_liters = transactions.aggregate(
            total=Sum('liters')
        )['total'] or Decimal('0.00')

        # Cost by vehicle
        cost_by_vehicle = list(
            transactions.values(
                'vehicle__id', 'vehicle__name', 'vehicle__plate'
            ).annotate(
                total_cost=Sum('total_cost'),
                total_liters=Sum('liters'),
                transaction_count=Count('id')
            ).order_by('-total_cost')
        )

        # Calculate km/L and cost/km for each vehicle
        for item in cost_by_vehicle:
            vehicle_id = item['vehicle__id']
            vehicle_txs = transactions.filter(vehicle_id=vehicle_id).order_by('purchased_at')

            if vehicle_txs.count() >= 2:
                first_tx = vehicle_txs.first()
                last_tx = vehicle_txs.last()
                km_traveled = last_tx.odometer_km - first_tx.odometer_km
                total_liters_vehicle = item['total_liters']

                if total_liters_vehicle > 0 and km_traveled > 0:
                    item['km_per_liter'] = round(km_traveled / float(total_liters_vehicle), 2)
                    item['cost_per_km'] = round(float(item['total_cost']) / km_traveled, 2)
                else:
                    item['km_per_liter'] = None
                    item['cost_per_km'] = None
            else:
                item['km_per_liter'] = None
                item['cost_per_km'] = None

        # Monthly trend (last 6 months)
        six_months_ago = timezone.now().date().replace(day=1)
        for _ in range(5):
            month = six_months_ago.month - 1 or 12
            year = six_months_ago.year if month != 12 else six_months_ago.year - 1
            six_months_ago = six_months_ago.replace(year=year, month=month, day=1)

        monthly_trend = list(
            FuelTransaction.objects.filter(
                purchased_at__date__gte=six_months_ago
            ).exclude(
                vehicle__usage_category=UsageCategory.PERSONAL
            ).annotate(
                month=TruncMonth('purchased_at')
            ).values('month').annotate(
                total_cost=Sum('total_cost'),
                total_liters=Sum('liters')
            ).order_by('month')
        )

        # National average reference (manual/external) vs actual cost
        fuel_types = list(transactions.values_list('fuel_type', flat=True).distinct())
        snapshots = FuelPriceSnapshot.objects.filter(
            fuel_type__in=fuel_types,
            station__isnull=True,
            source__in=[FuelPriceSource.EXTERNAL_ANP, FuelPriceSource.MANUAL],
        ).order_by('fuel_type', '-collected_at')

        latest_by_type = {}
        for snapshot in snapshots:
            if snapshot.fuel_type not in latest_by_type:
                latest_by_type[snapshot.fuel_type] = snapshot

        expected_cost = Decimal('0.00')
        actual_cost = Decimal('0.00')
        coverage_liters = Decimal('0.00')

        if latest_by_type:
            for tx in transactions.only('fuel_type', 'liters', 'total_cost'):
                snapshot = latest_by_type.get(tx.fuel_type)
                if snapshot:
                    coverage_liters += tx.liters
                    expected_cost += tx.liters * snapshot.price_per_liter
                    actual_cost += tx.total_cost

        if coverage_liters > 0:
            national_avg_price = expected_cost / coverage_liters
            delta = expected_cost - actual_cost
            delta_percent = float((delta / expected_cost) * 100) if expected_cost > 0 else 0.0
            coverage_ratio = float(coverage_liters / total_liters) if total_liters > 0 else 0.0
        else:
            national_avg_price = None
            delta = None
            delta_percent = None
            coverage_ratio = 0.0

        # Open alerts
        alerts_queryset = Alert.objects.filter(resolved_at__isnull=True)
        if not include_personal:
            alerts_queryset = alerts_queryset.exclude(
                vehicle__usage_category=UsageCategory.PERSONAL
            )

        alerts_open_count = alerts_queryset.count()
        top_alerts = list(
            alerts_queryset.select_related('vehicle').order_by('-created_at')[:5].values(
                'id', 'vehicle__name', 'type', 'severity', 'message', 'created_at'
            )
        )

        return Response({
            'period': {
                'from': from_date.isoformat(),
                'to': to_date.isoformat(),
                'include_personal': include_personal
            },
            'summary': {
                'total_cost': total_cost,
                'total_liters': total_liters,
                'transaction_count': transactions.count(),
            },
            'price_reference': {
                'national_avg_price': national_avg_price,
                'coverage_liters': coverage_liters,
                'coverage_ratio': coverage_ratio,
                'expected_cost': expected_cost if coverage_liters > 0 else None,
                'actual_cost': actual_cost if coverage_liters > 0 else None,
                'delta': delta,
                'delta_percent': delta_percent,
            },
            'cost_by_vehicle': cost_by_vehicle,
            'monthly_trend': monthly_trend,
            'alerts': {
                'open_count': alerts_open_count,
                'top_alerts': top_alerts
            }
        })
