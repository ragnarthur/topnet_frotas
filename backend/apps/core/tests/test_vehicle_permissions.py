import pytest

pytestmark = pytest.mark.django_db


def test_admin_can_create_vehicle(admin_api_client):
    response = admin_api_client.post(
        "/api/vehicles/",
        {
            "plate": "AAA1A11",
            "name": "Corsa",
            "model": "Wind",
            "fuel_type": "GASOLINE",
            "usage_category": "OPERATIONAL",
            "active": True,
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["plate"] == "AAA1A11"


def test_driver_cannot_create_vehicle(driver_api_client):
    response = driver_api_client.post(
        "/api/vehicles/",
        {
            "plate": "BBB2B22",
            "name": "Montana",
            "model": "2020",
            "fuel_type": "GASOLINE",
            "usage_category": "OPERATIONAL",
            "active": True,
        },
        format="json",
    )

    assert response.status_code == 403


def test_driver_sees_only_current_vehicle(driver_api_client, vehicle_operational, vehicle_personal, driver):
    response = driver_api_client.get("/api/vehicles/")

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(vehicle_operational.id)
