from decimal import Decimal

import pytest
from django.utils import timezone

from apps.alerts.models import Alert, AlertType
from apps.core.models import UsageCategory, Vehicle
from apps.fuel.models import FuelTransaction

pytestmark = pytest.mark.django_db


def test_alerts_generated_for_regression_and_over_tank(cost_center_operational):
    vehicle = Vehicle.objects.create(
        plate="REG1A11",
        name="Montana",
        model="2021",
        fuel_type="GASOLINE",
        usage_category=UsageCategory.OPERATIONAL,
        tank_capacity_liters=Decimal("40.0"),
    )

    FuelTransaction.objects.create(
        vehicle=vehicle,
        cost_center=cost_center_operational,
        purchased_at=timezone.now() - timezone.timedelta(days=1),
        liters=Decimal("20.000"),
        unit_price=Decimal("5.0000"),
        total_cost=Decimal("0.00"),
        odometer_km=1000,
        fuel_type=vehicle.fuel_type,
    )

    FuelTransaction.objects.create(
        vehicle=vehicle,
        cost_center=cost_center_operational,
        purchased_at=timezone.now(),
        liters=Decimal("50.000"),
        unit_price=Decimal("5.0000"),
        total_cost=Decimal("0.00"),
        odometer_km=900,
        fuel_type=vehicle.fuel_type,
    )

    types = set(Alert.objects.filter(vehicle=vehicle).values_list("type", flat=True))

    assert AlertType.ODOMETER_REGRESSION in types
    assert AlertType.LITERS_OVER_TANK in types


def test_personal_usage_alert(cost_center_operational):
    vehicle = Vehicle.objects.create(
        plate="PERS1A11",
        name="Captiva",
        model="2018",
        fuel_type="GASOLINE",
        usage_category=UsageCategory.PERSONAL,
        tank_capacity_liters=Decimal("60.0"),
    )

    FuelTransaction.objects.create(
        vehicle=vehicle,
        cost_center=cost_center_operational,
        purchased_at=timezone.now(),
        liters=Decimal("30.000"),
        unit_price=Decimal("5.0000"),
        total_cost=Decimal("0.00"),
        odometer_km=5000,
        fuel_type=vehicle.fuel_type,
    )

    assert Alert.objects.filter(vehicle=vehicle, type=AlertType.PERSONAL_USAGE).exists()
