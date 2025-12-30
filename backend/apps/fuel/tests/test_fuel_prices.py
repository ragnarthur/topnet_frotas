from decimal import Decimal

import pytest
from django.utils import timezone

from apps.fuel.models import FuelPriceSnapshot, FuelPriceSource

pytestmark = pytest.mark.django_db


def test_latest_fuel_price_requires_snapshot(admin_api_client):
    response = admin_api_client.get("/api/fuel-prices/latest/?fuel_type=GASOLINE")
    assert response.status_code == 404


def test_latest_fuel_price_returns_manual_snapshot(admin_api_client):
    FuelPriceSnapshot.objects.create(
        fuel_type="GASOLINE",
        station=None,
        price_per_liter=Decimal("5.5500"),
        collected_at=timezone.now(),
        source=FuelPriceSource.MANUAL,
    )

    response = admin_api_client.get("/api/fuel-prices/latest/?fuel_type=GASOLINE")

    assert response.status_code == 200
    assert Decimal(str(response.data["price_per_liter"])) == Decimal("5.5500")


def test_latest_fuel_price_returns_last_transaction_snapshot(admin_api_client, vehicle_operational):
    payload = {
        "vehicle": str(vehicle_operational.id),
        "purchased_at": timezone.now().isoformat(),
        "liters": "12.000",
        "unit_price": "6.1000",
        "odometer_km": 1850,
        "fuel_type": vehicle_operational.fuel_type,
    }

    created = admin_api_client.post("/api/fuel-transactions/", payload, format="json")
    assert created.status_code == 201

    response = admin_api_client.get(
        f"/api/fuel-prices/latest/?fuel_type={vehicle_operational.fuel_type}"
    )

    assert response.status_code == 200
    assert Decimal(str(response.data["price_per_liter"])) == Decimal("6.1000")
    assert response.data["source"] == FuelPriceSource.LAST_TRANSACTION
