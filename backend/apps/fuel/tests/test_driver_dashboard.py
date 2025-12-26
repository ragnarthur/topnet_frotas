from decimal import Decimal

import pytest
from django.utils import timezone

from apps.fuel.models import FuelTransaction

pytestmark = pytest.mark.django_db


def test_driver_dashboard_returns_stats(driver_api_client, driver):
    FuelTransaction.objects.create(
        vehicle=driver.current_vehicle,
        driver=driver,
        purchased_at=timezone.now() - timezone.timedelta(days=2),
        liters=Decimal("8.000"),
        unit_price=Decimal("5.0000"),
        total_cost=Decimal("0.00"),
        odometer_km=1000,
        fuel_type=driver.current_vehicle.fuel_type,
    )
    FuelTransaction.objects.create(
        vehicle=driver.current_vehicle,
        driver=driver,
        purchased_at=timezone.now(),
        liters=Decimal("12.000"),
        unit_price=Decimal("5.0000"),
        total_cost=Decimal("0.00"),
        odometer_km=1150,
        fuel_type=driver.current_vehicle.fuel_type,
    )

    response = driver_api_client.get("/api/dashboard/driver/")

    assert response.status_code == 200
    assert response.data["driver"]["id"] == str(driver.id)
    assert response.data["stats"]["transaction_count"] == 2
    assert Decimal(str(response.data["stats"]["total_liters"])) == Decimal("20.000")
    assert Decimal(str(response.data["stats"]["total_cost"])) == Decimal("100.00")
