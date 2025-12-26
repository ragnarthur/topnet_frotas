from decimal import Decimal

import pytest
from django.utils import timezone

from apps.fuel.models import FuelPriceSnapshot, FuelPriceSource, FuelTransaction

pytestmark = pytest.mark.django_db


def test_dashboard_summary_includes_national_average(admin_api_client, vehicle_operational):
    timestamp = timezone.now()
    FuelPriceSnapshot.objects.create(
        fuel_type=vehicle_operational.fuel_type,
        station=None,
        price_per_liter=Decimal("5.0000"),
        collected_at=timestamp,
        source=FuelPriceSource.MANUAL,
    )

    FuelTransaction.objects.create(
        vehicle=vehicle_operational,
        purchased_at=timestamp,
        liters=Decimal("10.000"),
        unit_price=Decimal("4.0000"),
        total_cost=Decimal("40.00"),
        odometer_km=1200,
        fuel_type=vehicle_operational.fuel_type,
    )

    from_date = (timestamp - timezone.timedelta(days=1)).date().isoformat()
    to_date = (timestamp + timezone.timedelta(days=1)).date().isoformat()
    response = admin_api_client.get(f"/api/dashboard/summary/?from={from_date}&to={to_date}")

    assert response.status_code == 200
    assert Decimal(str(response.data["summary"]["total_cost"])) == Decimal("40.00")
    assert Decimal(str(response.data["price_reference"]["national_avg_price"])) == Decimal("5.0000")
    assert Decimal(str(response.data["price_reference"]["expected_cost"])) == Decimal("50.0000")
    assert Decimal(str(response.data["price_reference"]["actual_cost"])) == Decimal("40.00")
    assert Decimal(str(response.data["price_reference"]["delta"])) == Decimal("10.0000")


def test_dashboard_summary_filters_personal(admin_api_client, vehicle_operational, vehicle_personal):
    timestamp = timezone.now()
    FuelTransaction.objects.create(
        vehicle=vehicle_operational,
        purchased_at=timestamp,
        liters=Decimal("10.000"),
        unit_price=Decimal("4.0000"),
        total_cost=Decimal("40.00"),
        odometer_km=1500,
        fuel_type=vehicle_operational.fuel_type,
    )
    FuelTransaction.objects.create(
        vehicle=vehicle_personal,
        purchased_at=timestamp,
        liters=Decimal("5.000"),
        unit_price=Decimal("5.0000"),
        total_cost=Decimal("25.00"),
        odometer_km=8000,
        fuel_type=vehicle_personal.fuel_type,
    )

    from_date = (timestamp - timezone.timedelta(days=1)).date().isoformat()
    to_date = (timestamp + timezone.timedelta(days=1)).date().isoformat()
    response = admin_api_client.get(
        f"/api/dashboard/summary/?from={from_date}&to={to_date}&include_personal=0"
    )

    assert response.status_code == 200
    assert Decimal(str(response.data["summary"]["total_cost"])) == Decimal("40.00")

    response_all = admin_api_client.get(
        f"/api/dashboard/summary/?from={from_date}&to={to_date}&include_personal=1"
    )
    assert Decimal(str(response_all.data["summary"]["total_cost"])) == Decimal("65.00")
