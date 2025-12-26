import pytest
from django.conf import settings

pytestmark = pytest.mark.django_db


def test_login_sets_refresh_cookie(api_client, admin_user):
    response = api_client.post(
        "/api/auth/token/",
        {"username": admin_user.username, "password": "admin123"},
        format="json",
    )

    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" not in response.data
    assert settings.JWT_REFRESH_COOKIE_NAME in response.cookies


def test_refresh_uses_cookie(api_client, admin_user):
    login = api_client.post(
        "/api/auth/token/",
        {"username": admin_user.username, "password": "admin123"},
        format="json",
    )
    assert login.status_code == 200

    refresh_cookie = login.cookies.get(settings.JWT_REFRESH_COOKIE_NAME)
    assert refresh_cookie is not None
    api_client.cookies[settings.JWT_REFRESH_COOKIE_NAME] = refresh_cookie.value

    refresh = api_client.post(
        "/api/auth/token/refresh/",
        {"refresh": refresh_cookie.value},
        format="json",
    )

    assert refresh.status_code == 200
    assert "access" in refresh.data


def test_profile_returns_driver_info(driver_api_client, driver):
    response = driver_api_client.get("/api/auth/profile/")

    assert response.status_code == 200
    assert response.data["role"] == "driver"
    assert response.data["driver"]["id"] == str(driver.id)
    assert response.data["driver"]["current_vehicle"]["id"] == str(driver.current_vehicle_id)
