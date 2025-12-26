import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import (
    CostCenter,
    CostCenterCategory,
    Driver,
    FuelStation,
    FuelType,
    UsageCategory,
    Vehicle,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    User = get_user_model()
    user = User.objects.create_user(
        username="admin_test",
        email="admin@example.com",
        password="admin123",
        is_staff=True,
        is_superuser=True,
    )
    return user


@pytest.fixture
def driver_user():
    User = get_user_model()
    user = User.objects.create_user(
        username="driver_test",
        email="driver@example.com",
        password="driver123",
        is_staff=False,
    )
    return user


@pytest.fixture
def admin_api_client(api_client, admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def driver_api_client(api_client, driver_user):
    client = APIClient()
    client.force_authenticate(user=driver_user)
    return client


@pytest.fixture
def vehicle_operational():
    return Vehicle.objects.create(
        plate="ABC1D23",
        name="Troller",
        model="T4",
        fuel_type=FuelType.DIESEL,
        usage_category=UsageCategory.OPERATIONAL,
        tank_capacity_liters=60,
    )


@pytest.fixture
def vehicle_personal():
    return Vehicle.objects.create(
        plate="XYZ9Z99",
        name="Captiva",
        model="Sport",
        fuel_type=FuelType.GASOLINE,
        usage_category=UsageCategory.PERSONAL,
        tank_capacity_liters=70,
    )


@pytest.fixture
def driver(driver_user, vehicle_operational):
    return Driver.objects.create(
        user=driver_user,
        current_vehicle=vehicle_operational,
        name="Joao Motorista",
        doc_id="00000000000",
        phone="11999999999",
        active=True,
    )


@pytest.fixture
def cost_center_operational():
    return CostCenter.objects.create(
        name="Rural",
        category=CostCenterCategory.RURAL,
        active=True,
    )


@pytest.fixture
def cost_center_admin():
    return CostCenter.objects.create(
        name="Admin",
        category=CostCenterCategory.ADMIN,
        active=True,
    )


@pytest.fixture
def fuel_station():
    return FuelStation.objects.create(
        name="Posto Central",
        city="Sao Paulo",
        address="Rua 1",
        active=True,
    )


@pytest.fixture
def now():
    return timezone.now()
