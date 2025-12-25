"""
Seed demo data for TopNet Frotas: users, driver assignments and transactions.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import CostCenter, Driver, FuelStation, Vehicle
from apps.fuel.models import FuelPriceSnapshot, FuelTransaction


class Command(BaseCommand):
    help = 'Seed demo data (users, driver vehicle assignments, transactions)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding base data...')
        call_command('seed_data')

        User = get_user_model()

        # Admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@topnet.local',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin_updated = False
        if created:
            admin_user.set_password('admin123')
            admin_updated = True
        else:
            if not admin_user.is_staff:
                admin_user.is_staff = True
                admin_updated = True
            if not admin_user.is_superuser:
                admin_user.is_superuser = True
                admin_updated = True
        if admin_updated:
            admin_user.save()
            self.stdout.write('  Admin user ready: admin / admin123')

        # Driver users + assignments
        driver_defs = [
            {
                'name': 'João Silva',
                'username': 'joao',
                'password': 'driver123',
                'plate': 'ABC-1234',
                'doc_id': '123.456.789-00',
                'phone': '(11) 99999-1111',
            },
            {
                'name': 'Maria Santos',
                'username': 'maria',
                'password': 'driver123',
                'plate': 'DEF-5678',
                'doc_id': '234.567.890-11',
                'phone': '(11) 99999-2222',
            },
            {
                'name': 'Pedro Costa',
                'username': 'pedro',
                'password': 'driver123',
                'plate': 'GHI-9012',
                'doc_id': '345.678.901-22',
                'phone': '(11) 99999-3333',
            },
        ]

        for data in driver_defs:
            user, user_created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': f"{data['username']}@topnet.local",
                    'first_name': data['name'].split(' ')[0],
                }
            )
            if user_created:
                user.set_password(data['password'])
                user.save()

            driver = Driver.objects.filter(name=data['name']).first()
            if not driver:
                driver = Driver.objects.create(
                    name=data['name'],
                    doc_id=data['doc_id'],
                    phone=data['phone'],
                    active=True,
                )

            vehicle = Vehicle.objects.filter(plate=data['plate']).first()
            driver.user = user
            driver.current_vehicle = vehicle
            if not driver.doc_id:
                driver.doc_id = data['doc_id']
            if not driver.phone:
                driver.phone = data['phone']
            driver.save()

        # Transactions
        if FuelTransaction.objects.filter(notes__icontains='seed:demo').exists():
            self.stdout.write('  Seed transactions already exist. Skipping.')
            self.stdout.write(self.style.SUCCESS('Demo seed completed.'))
            return

        stations = list(FuelStation.objects.filter(active=True))
        cost_centers = list(CostCenter.objects.filter(active=True))
        now = timezone.now()

        self.stdout.write('Creating demo transactions...')
        for index, data in enumerate(driver_defs):
            driver = Driver.objects.filter(name=data['name']).first()
            if not driver or not driver.current_vehicle:
                continue

            vehicle = driver.current_vehicle
            base_odometer = 20000 + (index * 800)

            for i in range(4):
                purchased_at = now - timedelta(days=(i * 7) + index)
                liters = Decimal('35.00') + Decimal(str(i)) * Decimal('2.50')
                base_price = FuelPriceSnapshot.get_latest_price(vehicle.fuel_type) or Decimal('5.00')
                unit_price = base_price + Decimal('0.05') * (i % 2)
                odometer_km = base_odometer + (i * 420) + (index * 35)

                station = stations[(index + i) % len(stations)] if stations else None
                cost_center = cost_centers[(index + i) % len(cost_centers)] if cost_centers else None

                FuelTransaction.objects.create(
                    vehicle=vehicle,
                    driver=driver,
                    station=station,
                    cost_center=cost_center,
                    purchased_at=purchased_at,
                    liters=liters,
                    unit_price=unit_price,
                    total_cost=liters * unit_price,
                    odometer_km=odometer_km,
                    fuel_type=vehicle.fuel_type,
                    notes='seed:demo',
                )

        self.stdout.write(self.style.SUCCESS('Demo seed completed.'))
