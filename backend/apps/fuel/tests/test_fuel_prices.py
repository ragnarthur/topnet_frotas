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
