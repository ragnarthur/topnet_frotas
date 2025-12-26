import csv
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.utils.dateparse import parse_date
from django_filters import rest_framework as filters
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.alerts.models import Alert
from apps.core.audit import AuditAction, AuditMixin, model_to_dict
from apps.core.models import FuelType, UsageCategory
from apps.users.permissions import IsAdminOrDriver, IsAdminUser, IsDriver

from .models import FuelPriceSnapshot, FuelPriceSource, FuelTransaction
from .serializers import (
    FuelPriceSnapshotSerializer,
    FuelTransactionCreateSerializer,
    FuelTransactionListSerializer,
    FuelTransactionSerializer,
    NationalFuelPriceUpsertSerializer,
)
from .services import (
    generate_csv_template,
    get_csv_format_specification,
    import_fuel_transactions,
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


class FuelTransactionViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = FuelTransaction.objects.select_related(
        'vehicle', 'driver', 'station', 'cost_center'
    ).all()
    permission_classes = [IsAdminOrDriver]
    filterset_class = FuelTransactionFilter
    search_fields = ['vehicle__name', 'vehicle__plate', 'notes']
    ordering_fields = ['purchased_at', 'total_cost', 'liters', 'odometer_km']
    ordering = ['-purchased_at']
    audit_serializer_class = FuelTransactionSerializer

    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        queryset = super().get_queryset()

        # Admins see all transactions
        if user.is_staff:
            return queryset

        # Drivers see only their own transactions
        if hasattr(user, 'driver_profile') and user.driver_profile:
            return queryset.filter(driver=user.driver_profile)

        # No access for other users
        return queryset.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return FuelTransactionListSerializer
        if self.action == 'create':
            return FuelTransactionCreateSerializer
        return FuelTransactionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return full transaction data
        output_serializer = FuelTransactionSerializer(serializer.instance)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        """Auto-set driver field for driver users."""
        user = self.request.user

        if user.is_staff:
            instance = serializer.save()
            audit_serializer = self.get_audit_serializer_class()
            new_data = model_to_dict(instance, audit_serializer)
            self._audit_log(AuditAction.CREATE, instance, new_data=new_data)
            return instance

        driver = getattr(user, 'driver_profile', None)
        if not driver:
            raise PermissionDenied('Somente motoristas podem registrar abastecimentos.')

        if not driver.current_vehicle_id:
            raise ValidationError({
                'vehicle': 'Motorista sem veículo atual definido. Solicite ao administrador.'
            })

        requested_vehicle = serializer.validated_data.get('vehicle')
        if requested_vehicle and requested_vehicle.id != driver.current_vehicle_id:
            raise ValidationError({
                'vehicle': 'Motorista só pode registrar abastecimento do veículo atual.'
            })

        instance = serializer.save(driver=driver, vehicle=driver.current_vehicle)
        audit_serializer = self.get_audit_serializer_class()
        new_data = model_to_dict(instance, audit_serializer)
        self._audit_log(AuditAction.CREATE, instance, new_data=new_data)
        return instance

    def update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied('Somente administradores podem editar abastecimentos.')
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied('Somente administradores podem excluir abastecimentos.')
        return super().destroy(request, *args, **kwargs)


class FuelPriceSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FuelPriceSnapshot.objects.select_related('station').all()
    serializer_class = FuelPriceSnapshotSerializer
    permission_classes = [IsAdminUser]
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


class NationalFuelPriceView(APIView):
    """Create/update national average fuel price (manual reference)."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = NationalFuelPriceUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        fuel_type = serializer.validated_data['fuel_type']
        price_per_liter = serializer.validated_data['price_per_liter']
        collected_at = serializer.validated_data.get('collected_at') or timezone.now()

        snapshot, _ = FuelPriceSnapshot.objects.update_or_create(
            fuel_type=fuel_type,
            station=None,
            defaults={
                'price_per_liter': price_per_liter,
                'collected_at': collected_at,
                'source': FuelPriceSource.MANUAL,
            }
        )

        return Response(FuelPriceSnapshotSerializer(snapshot).data, status=status.HTTP_200_OK)


class DashboardSummaryView(APIView):
    """Dashboard summary with costs, consumption and alerts."""
    permission_classes = [IsAdminUser]

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
            parsed_from = parse_date(from_date)
            if not parsed_from:
                return Response(
                    {'error': "Invalid 'from' date. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            from_date = parsed_from

        if not to_date:
            to_date = timezone.now().date()
        else:
            parsed_to = parse_date(to_date)
            if not parsed_to:
                return Response(
                    {'error': "Invalid 'to' date. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            to_date = parsed_to

        if from_date > to_date:
            return Response(
                {'error': "'from' date must be earlier than or equal to 'to' date."},
                status=status.HTTP_400_BAD_REQUEST
            )

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
        all_fuel_types = [choice[0] for choice in FuelType.choices]
        fuel_types = list(transactions.values_list('fuel_type', flat=True).distinct())
        snapshots = FuelPriceSnapshot.objects.filter(
            fuel_type__in=all_fuel_types,
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

        national_avg_prices = []
        for fuel_type in all_fuel_types:
            snapshot = latest_by_type.get(fuel_type)
            national_avg_prices.append({
                'fuel_type': fuel_type,
                'price_per_liter': snapshot.price_per_liter if snapshot else None,
                'collected_at': snapshot.collected_at if snapshot else None,
                'source': snapshot.source if snapshot else None,
            })

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
                'national_avg_prices': national_avg_prices,
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


class FetchANPPricesView(APIView):
    """Manually trigger ANP price fetch."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        from apps.fuel.services import fetch_and_save_anp_prices

        result = fetch_and_save_anp_prices()

        if result['success']:
            return Response({
                'message': 'ANP prices updated successfully',
                'prices_updated': result['prices_updated'],
                'source_url': result.get('source_url'),
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'message': 'Failed to fetch ANP prices',
                'errors': result['errors'],
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FuelTransactionsExportView(APIView):
    """Export fuel transactions to CSV."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        include_personal = request.query_params.get('include_personal', '0') == '1'

        if not from_date:
            today = timezone.now().date()
            from_date = today.replace(day=1)
        else:
            parsed_from = parse_date(from_date)
            if not parsed_from:
                return Response(
                    {'error': "Invalid 'from' date. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            from_date = parsed_from

        if not to_date:
            to_date = timezone.now().date()
        else:
            parsed_to = parse_date(to_date)
            if not parsed_to:
                return Response(
                    {'error': "Invalid 'to' date. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            to_date = parsed_to

        if from_date > to_date:
            return Response(
                {'error': "'from' date must be earlier than or equal to 'to' date."},
                status=status.HTTP_400_BAD_REQUEST
            )

        transactions = FuelTransaction.objects.select_related(
            'vehicle', 'driver', 'station', 'cost_center'
        ).filter(
            purchased_at__date__gte=from_date,
            purchased_at__date__lte=to_date
        )

        if not include_personal:
            transactions = transactions.exclude(
                vehicle__usage_category=UsageCategory.PERSONAL
            )

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = (
            f'attachment; filename="abastecimentos_{from_date}_{to_date}.csv"'
        )

        writer = csv.writer(response)
        writer.writerow([
            'Data/Hora', 'Veiculo', 'Placa', 'Motorista', 'Posto',
            'Centro de Custo', 'Litros', 'Preco/L', 'Total', 'Odometro (km)',
            'Combustivel', 'Observacoes'
        ])

        for tx in transactions.order_by('-purchased_at'):
            writer.writerow([
                tx.purchased_at.isoformat(sep=' ', timespec='minutes'),
                tx.vehicle.name,
                tx.vehicle.plate,
                tx.driver.name if tx.driver else '',
                tx.station.name if tx.station else '',
                tx.cost_center.name if tx.cost_center else '',
                f'{tx.liters}',
                f'{tx.unit_price}',
                f'{tx.total_cost}',
                tx.odometer_km,
                tx.fuel_type,
                tx.notes or '',
            ])

        return response


class DriverDashboardView(APIView):
    """Dashboard for drivers - shows their own stats and recent transactions."""
    permission_classes = [IsDriver]

    def get(self, request):
        user = request.user

        driver = user.driver_profile

        # Get driver's transactions (last 30 days)
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        transactions = FuelTransaction.objects.filter(
            driver=driver,
            purchased_at__date__gte=thirty_days_ago
        ).order_by('-purchased_at')

        # Calculate stats
        total_liters = transactions.aggregate(total=Sum('liters'))['total'] or Decimal('0.00')
        total_cost = transactions.aggregate(total=Sum('total_cost'))['total'] or Decimal('0.00')
        transaction_count = transactions.count()

        # Calculate average km/L if we have enough data
        avg_km_per_liter = None
        if transactions.count() >= 2:
            # Group by vehicle and calculate km/L
            vehicles_with_txs = transactions.values('vehicle').distinct()
            total_km = 0
            total_l = 0
            for v in vehicles_with_txs:
                v_txs = transactions.filter(vehicle_id=v['vehicle']).order_by('purchased_at')
                if v_txs.count() >= 2:
                    first_tx = v_txs.first()
                    last_tx = v_txs.last()
                    km = last_tx.odometer_km - first_tx.odometer_km
                    liters = v_txs.aggregate(total=Sum('liters'))['total']
                    if km > 0 and liters > 0:
                        total_km += km
                        total_l += float(liters)

            if total_km > 0 and total_l > 0:
                avg_km_per_liter = round(total_km / total_l, 2)

        # Recent transactions (last 10)
        recent_transactions = list(
            transactions[:10].values(
                'id', 'vehicle__name', 'vehicle__plate',
                'purchased_at', 'liters', 'total_cost', 'odometer_km'
            )
        )

        return Response({
            'driver': {
                'id': str(driver.id),
                'name': driver.name,
            },
            'period': {
                'from': thirty_days_ago.isoformat(),
                'to': timezone.now().date().isoformat(),
            },
            'stats': {
                'total_liters': total_liters,
                'total_cost': total_cost,
                'transaction_count': transaction_count,
                'avg_km_per_liter': avg_km_per_liter,
            },
            'recent_transactions': recent_transactions,
        })


class FuelTransactionsImportView(APIView):
    """
    Import fuel transactions from CSV file.

    Accepts multipart/form-data with a 'file' field containing the CSV.
    Returns a detailed report of the import operation.
    """
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'Arquivo CSV e obrigatorio.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file extension
        filename = file.name.lower()
        if not filename.endswith('.csv'):
            return Response(
                {'error': 'Arquivo deve ser no formato CSV.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 10MB)
        if file.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'Arquivo muito grande. Maximo permitido: 10MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = import_fuel_transactions(file.read())
            response_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
            return Response(result.to_dict(), status=response_status)
        except Exception as e:
            return Response(
                {'error': f'Erro ao processar arquivo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FuelTransactionsImportTemplateView(APIView):
    """Download CSV template for fuel transactions import."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        template = generate_csv_template()

        response = HttpResponse(template, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="modelo_importacao_abastecimentos.csv"'
        return response


class FuelTransactionsImportFormatView(APIView):
    """Get CSV format specification for documentation."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(get_csv_format_specification())
