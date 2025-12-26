from decimal import Decimal

import pytest
from django.utils import timezone

from apps.fuel.models import FuelPriceSnapshot

pytestmark = pytest.mark.django_db


def test_admin_create_transaction_creates_snapshot(admin_api_client, vehicle_operational, fuel_station):
    payload = {
        "vehicle": str(vehicle_operational.id),
        "station": str(fuel_station.id),
        "purchased_at": timezone.now().isoformat(),
        "liters": "10.000",
        "unit_price": "6.0000",
        "odometer_km": 1500,
        "fuel_type": vehicle_operational.fuel_type,
    }

    response = admin_api_client.post("/api/fuel-transactions/", payload, format="json")

    assert response.status_code == 201
    assert Decimal(str(response.data["total_cost"])) == Decimal("60.0000")

    snapshot = FuelPriceSnapshot.objects.filter(
        fuel_type=vehicle_operational.fuel_type,
        station=fuel_station,
    ).first()
    assert snapshot is not None
    assert snapshot.price_per_liter == Decimal("6.0000")


def test_driver_cannot_use_other_vehicle(driver_api_client, driver, vehicle_personal):
    payload = {
        "vehicle": str(vehicle_personal.id),
        "purchased_at": timezone.now().isoformat(),
        "liters": "12.000",
        "unit_price": "5.0000",
        "odometer_km": 2000,
        "fuel_type": vehicle_personal.fuel_type,
    }

    response = driver_api_client.post("/api/fuel-transactions/", payload, format="json")

    assert response.status_code == 400
    assert "vehicle" in response.data


def test_driver_create_transaction_auto_assigns(driver_api_client, driver):
    payload = {
        "vehicle": str(driver.current_vehicle_id),
        "purchased_at": timezone.now().isoformat(),
        "liters": "15.000",
        "unit_price": "5.0000",
        "odometer_km": 2100,
        "fuel_type": driver.current_vehicle.fuel_type,
    }

    response = driver_api_client.post("/api/fuel-transactions/", payload, format="json")

    assert response.status_code == 201
    assert str(response.data["driver"]) == str(driver.id)
    assert str(response.data["vehicle"]) == str(driver.current_vehicle_id)


def test_driver_cannot_update_transaction(driver_api_client, admin_api_client, vehicle_operational):
    payload = {
        "vehicle": str(vehicle_operational.id),
        "purchased_at": timezone.now().isoformat(),
        "liters": "9.000",
        "unit_price": "5.0000",
        "odometer_km": 1000,
        "fuel_type": vehicle_operational.fuel_type,
    }

    created = admin_api_client.post("/api/fuel-transactions/", payload, format="json")
    assert created.status_code == 201

    response = driver_api_client.patch(
        f"/api/fuel-transactions/{created.data['id']}/",
        {"notes": "teste"},
        format="json",
    )

    assert response.status_code == 403
