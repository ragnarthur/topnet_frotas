"""
Management command to seed initial data for TopNet Frotas.
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import (
    CostCenter,
    CostCenterCategory,
    Driver,
    FuelStation,
    FuelType,
    UsageCategory,
    Vehicle,
)
from apps.fuel.models import FuelPriceSnapshot, FuelPriceSource


class Command(BaseCommand):
    help = 'Seed initial data for TopNet Frotas (vehicles, drivers, cost centers, stations)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding TopNet Frotas data...\n')

        # Create vehicles
        vehicles_data = [
            {
                'plate': 'ABC-1234',
                'name': 'Troller',
                'model': 'Troller T4 2020',
                'fuel_type': FuelType.DIESEL,
                'tank_capacity_liters': Decimal('75.00'),
                'usage_category': UsageCategory.OPERATIONAL,
                'min_expected_km_per_liter': Decimal('7.00'),
                'max_expected_km_per_liter': Decimal('12.00'),
            },
            {
                'plate': 'DEF-5678',
                'name': 'Corsa Wind',
                'model': 'Chevrolet Corsa Wind 2005',
                'fuel_type': FuelType.GASOLINE,
                'tank_capacity_liters': Decimal('45.00'),
                'usage_category': UsageCategory.OPERATIONAL,
                'min_expected_km_per_liter': Decimal('10.00'),
                'max_expected_km_per_liter': Decimal('16.00'),
            },
            {
                'plate': 'GHI-9012',
                'name': 'Montana',
                'model': 'Chevrolet Montana 2018',
                'fuel_type': FuelType.GASOLINE,
                'tank_capacity_liters': Decimal('55.00'),
                'usage_category': UsageCategory.OPERATIONAL,
                'min_expected_km_per_liter': Decimal('8.00'),
                'max_expected_km_per_liter': Decimal('13.00'),
            },
            {
                'plate': 'JKL-3456',
                'name': 'Captiva',
                'model': 'Chevrolet Captiva 2015',
                'fuel_type': FuelType.GASOLINE,
                'tank_capacity_liters': Decimal('65.00'),
                'usage_category': UsageCategory.PERSONAL,  # Uso pessoal do dono
                'min_expected_km_per_liter': Decimal('6.00'),
                'max_expected_km_per_liter': Decimal('10.00'),
            },
        ]

        for v_data in vehicles_data:
            vehicle, created = Vehicle.objects.update_or_create(
                plate=v_data['plate'],
                defaults=v_data
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status} vehicle: {vehicle.name} ({vehicle.plate})')

        # Create drivers
        drivers_data = [
            {'name': 'João Silva', 'doc_id': '123.456.789-00', 'phone': '(11) 99999-1111'},
            {'name': 'Maria Santos', 'doc_id': '234.567.890-11', 'phone': '(11) 99999-2222'},
            {'name': 'Pedro Costa', 'doc_id': '345.678.901-22', 'phone': '(11) 99999-3333'},
        ]

        for d_data in drivers_data:
            driver, created = Driver.objects.update_or_create(
                name=d_data['name'],
                defaults=d_data
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status} driver: {driver.name}')

        # Create cost centers
        cost_centers_data = [
            {'name': 'Rural - Instalações', 'category': CostCenterCategory.RURAL},
            {'name': 'Urbano - Instalações', 'category': CostCenterCategory.URBAN},
            {'name': 'Instalações Novas', 'category': CostCenterCategory.INSTALLATION},
            {'name': 'Manutenção Preventiva', 'category': CostCenterCategory.MAINTENANCE},
            {'name': 'Manutenção Corretiva', 'category': CostCenterCategory.MAINTENANCE},
            {'name': 'Administrativo', 'category': CostCenterCategory.ADMIN},
        ]

        for cc_data in cost_centers_data:
            cost_center, created = CostCenter.objects.update_or_create(
                name=cc_data['name'],
                defaults=cc_data
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status} cost center: {cost_center.name}')

        # Create fuel stations
        stations_data = [
            {'name': 'Posto Shell Centro', 'city': 'São Paulo', 'address': 'Av. Paulista, 1000'},
            {'name': 'Posto Ipiranga Norte', 'city': 'São Paulo', 'address': 'Av. Santana, 500'},
            {'name': 'Posto BR Sul', 'city': 'São Paulo', 'address': 'Av. Santo Amaro, 2000'},
        ]

        for s_data in stations_data:
            station, created = FuelStation.objects.update_or_create(
                name=s_data['name'],
                defaults=s_data
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status} station: {station.name}')

        # Create national average fuel price snapshots (manual reference)
        avg_prices = [
            (FuelType.GASOLINE, Decimal('5.49')),
            (FuelType.ETHANOL, Decimal('3.89')),
            (FuelType.DIESEL, Decimal('6.39')),
        ]

        for fuel_type, price in avg_prices:
            snapshot, created = FuelPriceSnapshot.objects.update_or_create(
                fuel_type=fuel_type,
                station=None,
                defaults={
                    'price_per_liter': price,
                    'collected_at': timezone.now(),
                    'source': FuelPriceSource.MANUAL,
                }
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(
                f'  {status} national avg price: {snapshot.get_fuel_type_display()} = R$ {snapshot.price_per_liter}'
            )

        self.stdout.write(self.style.SUCCESS('\nSeed completed successfully!'))
        self.stdout.write(f'\nSummary:')
        self.stdout.write(f'  Vehicles: {Vehicle.objects.count()}')
        self.stdout.write(f'  Drivers: {Driver.objects.count()}')
        self.stdout.write(f'  Cost Centers: {CostCenter.objects.count()}')
        self.stdout.write(f'  Fuel Stations: {FuelStation.objects.count()}')
        self.stdout.write(f'  Fuel Price Snapshots: {FuelPriceSnapshot.objects.count()}')
