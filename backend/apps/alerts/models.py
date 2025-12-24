import uuid

from django.db import models

from apps.core.models import BaseModel, Vehicle
from apps.fuel.models import FuelTransaction


class AlertType(models.TextChoices):
    ODOMETER_REGRESSION = 'ODOMETER_REGRESSION', 'Regressão de Odômetro'
    LITERS_OVER_TANK = 'LITERS_OVER_TANK', 'Litros Acima da Capacidade'
    OUTLIER_CONSUMPTION = 'OUTLIER_CONSUMPTION', 'Consumo Anômalo'
    PERSONAL_USAGE = 'PERSONAL_USAGE', 'Uso Pessoal'


class AlertSeverity(models.TextChoices):
    INFO = 'INFO', 'Informação'
    WARN = 'WARN', 'Aviso'
    CRITICAL = 'CRITICAL', 'Crítico'


class Alert(BaseModel):
    """Alert model for consistency checks and notifications."""
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='alerts',
        verbose_name='Veículo'
    )
    fuel_transaction = models.ForeignKey(
        FuelTransaction,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='alerts',
        verbose_name='Abastecimento'
    )
    type = models.CharField(
        'Tipo',
        max_length=30,
        choices=AlertType.choices
    )
    severity = models.CharField(
        'Severidade',
        max_length=10,
        choices=AlertSeverity.choices,
        default=AlertSeverity.WARN
    )
    message = models.TextField('Mensagem')
    resolved_at = models.DateTimeField('Resolvido em', null=True, blank=True)

    class Meta:
        verbose_name = 'Alerta'
        verbose_name_plural = 'Alertas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vehicle', '-created_at']),
            models.Index(fields=['type', '-created_at']),
            models.Index(fields=['resolved_at']),
        ]

    def __str__(self):
        return f'[{self.get_severity_display()}] {self.vehicle}: {self.get_type_display()}'

    @property
    def is_resolved(self):
        return self.resolved_at is not None

    def resolve(self):
        """Mark alert as resolved."""
        from django.utils import timezone
        if not self.resolved_at:
            self.resolved_at = timezone.now()
            self.save(update_fields=['resolved_at', 'updated_at'])
