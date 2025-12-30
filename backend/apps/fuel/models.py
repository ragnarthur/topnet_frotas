import uuid

from django.db import models
from django.db.models import Q

from apps.core.models import (
    BaseModel,
    CostCenter,
    Driver,
    FuelStation,
    FuelType,
    Vehicle,
)


class FuelPriceSource(models.TextChoices):
    LAST_TRANSACTION = 'last_transaction', 'Última Transação'
    MANUAL = 'manual', 'Manual'
    EXTERNAL_ANP = 'external_anp', 'ANP'


class FuelTransaction(BaseModel):
    """Fuel transaction (refueling) record."""
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        related_name='fuel_transactions',
        verbose_name='Veículo'
    )
    driver = models.ForeignKey(
        Driver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fuel_transactions',
        verbose_name='Motorista'
    )
    station = models.ForeignKey(
        FuelStation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fuel_transactions',
        verbose_name='Posto'
    )
    cost_center = models.ForeignKey(
        CostCenter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fuel_transactions',
        verbose_name='Centro de Custo'
    )
    purchased_at = models.DateTimeField('Data/Hora do Abastecimento')
    liters = models.DecimalField(
        'Litros',
        max_digits=8,
        decimal_places=3
    )
    unit_price = models.DecimalField(
        'Preço por Litro',
        max_digits=8,
        decimal_places=4
    )
    total_cost = models.DecimalField(
        'Valor Total',
        max_digits=10,
        decimal_places=2
    )
    odometer_km = models.PositiveIntegerField('Odômetro (km)')
    fuel_type = models.CharField(
        'Tipo de Combustível',
        max_length=20,
        choices=FuelType.choices,
        default=FuelType.GASOLINE
    )
    notes = models.TextField('Observações', blank=True)
    attachment = models.ImageField(
        'Comprovante',
        upload_to='fuel_transactions/%Y/%m/',
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = 'Abastecimento'
        verbose_name_plural = 'Abastecimentos'
        ordering = ['-purchased_at']
        indexes = [
            models.Index(fields=['vehicle', '-purchased_at']),
            models.Index(fields=['purchased_at']),
        ]

    def __str__(self):
        return f'{self.vehicle} - {self.purchased_at.strftime("%d/%m/%Y")} - {self.liters}L'

    def save(self, *args, **kwargs):
        # Auto-calculate total_cost if not provided or if liters/unit_price changed
        calculated_total = self.liters * self.unit_price
        if not self.total_cost or abs(self.total_cost - calculated_total) > 0.01:
            self.total_cost = calculated_total
        super().save(*args, **kwargs)

    @property
    def km_per_liter(self):
        """Calculate consumption (km/L) based on previous transaction."""
        previous = FuelTransaction.objects.filter(
            vehicle=self.vehicle,
            purchased_at__lt=self.purchased_at
        ).order_by('-purchased_at').first()

        if previous and self.odometer_km > previous.odometer_km:
            km_traveled = self.odometer_km - previous.odometer_km
            return round(km_traveled / float(self.liters), 2)
        return None


class FuelPriceSnapshot(BaseModel):
    """Snapshot of fuel prices for reference and auto-fill."""
    fuel_type = models.CharField(
        'Tipo de Combustível',
        max_length=20,
        choices=FuelType.choices
    )
    station = models.ForeignKey(
        FuelStation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='price_snapshots',
        verbose_name='Posto'
    )
    price_per_liter = models.DecimalField(
        'Preço por Litro',
        max_digits=8,
        decimal_places=4
    )
    collected_at = models.DateTimeField('Data da Coleta')
    source = models.CharField(
        'Fonte',
        max_length=30,
        choices=FuelPriceSource.choices,
        default=FuelPriceSource.LAST_TRANSACTION
    )

    class Meta:
        verbose_name = 'Snapshot de Preço'
        verbose_name_plural = 'Snapshots de Preço'
        ordering = ['-collected_at']
        indexes = [
            models.Index(fields=['fuel_type', '-collected_at']),
            models.Index(fields=['fuel_type', 'station', '-collected_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['fuel_type', 'source'],
                condition=Q(station__isnull=True),
                name='uniq_fuel_price_global_source',
            ),
            models.UniqueConstraint(
                fields=['fuel_type', 'station', 'source'],
                condition=Q(station__isnull=False),
                name='uniq_fuel_price_station_source',
            ),
        ]

    def __str__(self):
        station_name = self.station.name if self.station else 'Global'
        return f'{self.get_fuel_type_display()} @ {station_name}: R$ {self.price_per_liter}'

    @classmethod
    def get_latest_price(cls, fuel_type, station=None):
        """Get the most recent price for a fuel type, optionally at a specific station."""
        # First try station-specific price (if provided)
        if station:
            snapshot = cls.objects.filter(
                fuel_type=fuel_type,
                station=station,
                source=FuelPriceSource.LAST_TRANSACTION,
            ).first()
            if snapshot:
                return snapshot.price_per_liter

        # Prefer last transaction as global price reference
        snapshot = cls.objects.filter(
            fuel_type=fuel_type,
            station__isnull=True,
            source=FuelPriceSource.LAST_TRANSACTION,
        ).first()
        if snapshot:
            return snapshot.price_per_liter

        # Fall back to national average (external/manual)
        snapshot = cls.objects.filter(
            fuel_type=fuel_type,
            station__isnull=True,
            source__in=[FuelPriceSource.EXTERNAL_ANP, FuelPriceSource.MANUAL],
        ).order_by('-collected_at').first()
        if snapshot:
            return snapshot.price_per_liter

        return None
