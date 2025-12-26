"""
Seed a full year of fuel transactions for testing dashboards.
"""
import random
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import CostCenter, Driver, FuelStation, FuelType, UsageCategory, Vehicle
from apps.fuel.models import FuelPriceSnapshot, FuelTransaction


DEFAULT_BASE_PRICES = {
    FuelType.GASOLINE: Decimal('5.49'),
    FuelType.ETHANOL: Decimal('3.89'),
    FuelType.DIESEL: Decimal('6.39'),
}

DEFAULT_EFFICIENCY = {
    FuelType.GASOLINE: (11.0, 15.0),
    FuelType.ETHANOL: (8.0, 11.0),
    FuelType.DIESEL: (8.0, 12.0),
}


def _quantize(value, places):
    return Decimal(str(value)).quantize(Decimal(places), rounding=ROUND_HALF_UP)


def _efficiency_range(vehicle):
    default_min, default_max = DEFAULT_EFFICIENCY.get(vehicle.fuel_type, (8.0, 12.0))
    min_value = float(vehicle.min_expected_km_per_liter) if vehicle.min_expected_km_per_liter else None
    max_value = float(vehicle.max_expected_km_per_liter) if vehicle.max_expected_km_per_liter else None
    if min_value is None:
        min_value = default_min
    if max_value is None:
        max_value = default_max
    if max_value < min_value:
        max_value = min_value + 1.0
    return min_value, max_value


class Command(BaseCommand):
    help = 'Seed ~1 year of fuel transactions for dashboard testing.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=365, help='How many days back to seed.')
        parser.add_argument('--seed', type=int, default=42, help='Random seed for reproducibility.')
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing yearly seed transactions before seeding.'
        )

    def handle(self, *args, **options):
        days = options['days']
        rng = random.Random(options['seed'])

        self.stdout.write('Seeding base data...')
        call_command('seed_data')

        if options['reset']:
            deleted, _ = FuelTransaction.objects.filter(notes__icontains='seed:yearly').delete()
            self.stdout.write(f'  Deleted {deleted} existing yearly seed transactions.')
        elif FuelTransaction.objects.filter(notes__icontains='seed:yearly').exists():
            self.stdout.write('Yearly seed data already exists. Use --reset to recreate.')
            return

        vehicles = list(Vehicle.objects.filter(active=True))
        if not vehicles:
            self.stdout.write(self.style.WARNING('No active vehicles found. Aborting.'))
            return

        drivers = list(Driver.objects.filter(active=True))
        stations = list(FuelStation.objects.filter(active=True))
        cost_centers = list(CostCenter.objects.filter(active=True))

        driver_by_vehicle = {}
        for index, vehicle in enumerate(vehicles):
            if drivers:
                driver_by_vehicle[vehicle.id] = drivers[index % len(drivers)]

        now = timezone.now()
        start_date = now - timedelta(days=days)

        created = 0

        for vehicle in vehicles:
            usage = vehicle.usage_category
            if usage == UsageCategory.PERSONAL:
                interval_range = (10, 20)
                daily_km_range = (20, 60)
                min_liters = 10.0
                max_liters = float(vehicle.tank_capacity_liters) * 0.7 if vehicle.tank_capacity_liters else 40.0
            else:
                interval_range = (4, 10)
                daily_km_range = (50, 140)
                min_liters = 18.0
                max_liters = float(vehicle.tank_capacity_liters) * 0.9 if vehicle.tank_capacity_liters else 70.0

            efficiency_min, efficiency_max = _efficiency_range(vehicle)
            base_price = FuelPriceSnapshot.get_latest_price(vehicle.fuel_type) or DEFAULT_BASE_PRICES.get(
                vehicle.fuel_type, Decimal('5.00')
            )

            current_at = start_date
            odometer = rng.randint(15000, 80000)

            while True:
                interval_days = rng.randint(*interval_range)
                current_at = current_at + timedelta(days=interval_days)
                if current_at > now:
                    break

                purchased_at = current_at.replace(
                    hour=rng.randint(7, 20),
                    minute=rng.randint(0, 59),
                    second=0,
                    microsecond=0,
                )

                daily_km = rng.uniform(*daily_km_range)
                distance = daily_km * interval_days
                km_per_liter = rng.uniform(efficiency_min, efficiency_max)

                liters = distance / km_per_liter
                liters = max(min_liters, min(liters, max_liters))
                distance = liters * km_per_liter

                odometer += int(round(distance))

                months_ago = (now.year - purchased_at.year) * 12 + (now.month - purchased_at.month)
                trend = Decimal('1.0') - Decimal(months_ago) * Decimal('0.004')
                if trend < Decimal('0.85'):
                    trend = Decimal('0.85')
                variation = Decimal(str(rng.uniform(0.97, 1.05)))

                unit_price = _quantize(base_price * trend * variation, '0.0001')
                liters_dec = _quantize(liters, '0.001')
                total_cost = _quantize(liters_dec * unit_price, '0.01')

                FuelTransaction.objects.create(
                    vehicle=vehicle,
                    driver=driver_by_vehicle.get(vehicle.id),
                    station=rng.choice(stations) if stations else None,
                    cost_center=rng.choice(cost_centers) if cost_centers else None,
                    purchased_at=purchased_at,
                    liters=liters_dec,
                    unit_price=unit_price,
                    total_cost=total_cost,
                    odometer_km=odometer,
                    fuel_type=vehicle.fuel_type,
                    notes='seed:yearly',
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Yearly seed completed. Created {created} transactions.'))
