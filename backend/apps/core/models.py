import uuid

from django.db import models


class FuelType(models.TextChoices):
    GASOLINE = 'GASOLINE', 'Gasolina'
    ETHANOL = 'ETHANOL', 'Etanol'
    DIESEL = 'DIESEL', 'Diesel'


class UsageCategory(models.TextChoices):
    OPERATIONAL = 'OPERATIONAL', 'Operacional'
    PERSONAL = 'PERSONAL', 'Pessoal'


class CostCenterCategory(models.TextChoices):
    RURAL = 'RURAL', 'Rural'
    URBAN = 'URBAN', 'Urbano'
    INSTALLATION = 'INSTALLATION', 'Instalação'
    MAINTENANCE = 'MAINTENANCE', 'Manutenção'
    ADMIN = 'ADMIN', 'Administrativo'


class BaseModel(models.Model):
    """Base model with UUID primary key and timestamps."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Vehicle(BaseModel):
    """Vehicle model for fleet management."""
    plate = models.CharField('Placa', max_length=10, unique=True)
    name = models.CharField('Nome', max_length=100)
    model = models.CharField('Modelo', max_length=100, blank=True)
    fuel_type = models.CharField(
        'Tipo de Combustível',
        max_length=20,
        choices=FuelType.choices,
        default=FuelType.GASOLINE
    )
    tank_capacity_liters = models.DecimalField(
        'Capacidade do Tanque (L)',
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    usage_category = models.CharField(
        'Categoria de Uso',
        max_length=20,
        choices=UsageCategory.choices,
        default=UsageCategory.OPERATIONAL
    )
    # Consumption reference range for alerts (km/L)
    min_expected_km_per_liter = models.DecimalField(
        'Consumo Mínimo Esperado (km/L)',
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    max_expected_km_per_liter = models.DecimalField(
        'Consumo Máximo Esperado (km/L)',
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    active = models.BooleanField('Ativo', default=True)

    class Meta:
        verbose_name = 'Veículo'
        verbose_name_plural = 'Veículos'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.plate})'

    @property
    def last_odometer(self):
        """Get the last recorded odometer reading."""
        from apps.fuel.models import FuelTransaction
        last_tx = FuelTransaction.objects.filter(
            vehicle=self
        ).order_by('-purchased_at').first()
        return last_tx.odometer_km if last_tx else None


class Driver(BaseModel):
    """Driver model."""
    name = models.CharField('Nome', max_length=200)
    doc_id = models.CharField('CPF/RG', max_length=20, blank=True)
    phone = models.CharField('Telefone', max_length=20, blank=True)
    active = models.BooleanField('Ativo', default=True)

    class Meta:
        verbose_name = 'Motorista'
        verbose_name_plural = 'Motoristas'
        ordering = ['name']

    def __str__(self):
        return self.name


class CostCenter(BaseModel):
    """Cost center for categorizing expenses."""
    name = models.CharField('Nome', max_length=100)
    category = models.CharField(
        'Categoria',
        max_length=20,
        choices=CostCenterCategory.choices,
        default=CostCenterCategory.URBAN
    )
    active = models.BooleanField('Ativo', default=True)

    class Meta:
        verbose_name = 'Centro de Custo'
        verbose_name_plural = 'Centros de Custo'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.get_category_display()})'


class FuelStation(BaseModel):
    """Fuel station registry."""
    name = models.CharField('Nome', max_length=200)
    city = models.CharField('Cidade', max_length=100, blank=True)
    address = models.CharField('Endereço', max_length=300, blank=True)
    active = models.BooleanField('Ativo', default=True)

    class Meta:
        verbose_name = 'Posto'
        verbose_name_plural = 'Postos'
        ordering = ['name']

    def __str__(self):
        if self.city:
            return f'{self.name} - {self.city}'
        return self.name
