"""
Signals for automatic price updates and alert generation.

After each FuelTransaction is created/updated:
1. Update FuelPriceSnapshot with the new price
2. Generate consistency alerts (odometer regression, over tank capacity, etc.)
3. Publish event to Redis for realtime updates (optional)
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.alerts.models import Alert, AlertSeverity, AlertType
from apps.core.models import UsageCategory

from .models import FuelPriceSnapshot, FuelPriceSource, FuelTransaction

logger = logging.getLogger(__name__)


@receiver(post_save, sender=FuelTransaction)
def update_fuel_price_snapshot(sender, instance, created, **kwargs):
    """
    Update FuelPriceSnapshot with the price from this transaction.
    This keeps the "current price" always up-to-date based on real data.
    """
    try:
        # Update station-specific snapshot if station is set (pump price reference)
        if instance.station_id:
            FuelPriceSnapshot.objects.update_or_create(
                fuel_type=instance.fuel_type,
                station_id=instance.station_id,
                defaults={
                    'price_per_liter': instance.unit_price,
                    'collected_at': instance.purchased_at,
                    'source': FuelPriceSource.LAST_TRANSACTION,
                }
            )

        logger.info(
            f"Updated fuel price snapshot: {instance.fuel_type} = R$ {instance.unit_price}"
        )
    except Exception as e:
        logger.error(f"Error updating fuel price snapshot: {e}")


@receiver(post_save, sender=FuelTransaction)
def generate_consistency_alerts(sender, instance, created, **kwargs):
    """
    Generate alerts for consistency issues:
    - Odometer regression
    - Liters over tank capacity
    - Outlier consumption (km/L)
    - Personal usage marked as operational
    """
    if not created:
        # Only check on new transactions
        return

    vehicle = instance.vehicle
    alerts_to_create = []

    # 1. Check odometer regression
    previous = FuelTransaction.objects.filter(
        vehicle=vehicle,
        purchased_at__lt=instance.purchased_at
    ).order_by('-purchased_at').first()

    if previous and instance.odometer_km < previous.odometer_km:
        alerts_to_create.append(Alert(
            vehicle=vehicle,
            fuel_transaction=instance,
            type=AlertType.ODOMETER_REGRESSION,
            severity=AlertSeverity.CRITICAL,
            message=(
                f"Odômetro regrediu de {previous.odometer_km} km "
                f"para {instance.odometer_km} km. "
                f"Diferença: {previous.odometer_km - instance.odometer_km} km"
            )
        ))

    # 2. Check liters over tank capacity
    if vehicle.tank_capacity_liters and instance.liters > vehicle.tank_capacity_liters:
        alerts_to_create.append(Alert(
            vehicle=vehicle,
            fuel_transaction=instance,
            type=AlertType.LITERS_OVER_TANK,
            severity=AlertSeverity.WARN,
            message=(
                f"Litros abastecidos ({instance.liters}L) excedem "
                f"capacidade do tanque ({vehicle.tank_capacity_liters}L)"
            )
        ))

    # 3. Check consumption outlier
    if previous and instance.odometer_km > previous.odometer_km:
        km_traveled = instance.odometer_km - previous.odometer_km
        km_per_liter = km_traveled / float(instance.liters)

        # Check if vehicle has consumption range configured
        if vehicle.min_expected_km_per_liter and vehicle.max_expected_km_per_liter:
            if km_per_liter < float(vehicle.min_expected_km_per_liter):
                alerts_to_create.append(Alert(
                    vehicle=vehicle,
                    fuel_transaction=instance,
                    type=AlertType.OUTLIER_CONSUMPTION,
                    severity=AlertSeverity.WARN,
                    message=(
                        f"Consumo muito baixo: {km_per_liter:.2f} km/L. "
                        f"Esperado mínimo: {vehicle.min_expected_km_per_liter} km/L"
                    )
                ))
            elif km_per_liter > float(vehicle.max_expected_km_per_liter):
                alerts_to_create.append(Alert(
                    vehicle=vehicle,
                    fuel_transaction=instance,
                    type=AlertType.OUTLIER_CONSUMPTION,
                    severity=AlertSeverity.INFO,
                    message=(
                        f"Consumo muito alto: {km_per_liter:.2f} km/L. "
                        f"Esperado máximo: {vehicle.max_expected_km_per_liter} km/L. "
                        "Verificar se há erro no odômetro."
                    )
                ))

    # 4. Check personal usage
    if vehicle.usage_category == UsageCategory.PERSONAL:
        # If cost_center is operational (not ADMIN), flag it
        if instance.cost_center and instance.cost_center.category != 'ADMIN':
            alerts_to_create.append(Alert(
                vehicle=vehicle,
                fuel_transaction=instance,
                type=AlertType.PERSONAL_USAGE,
                severity=AlertSeverity.INFO,
                message=(
                    f"Veículo pessoal ({vehicle.name}) abastecido com "
                    f"centro de custo operacional: {instance.cost_center.name}"
                )
            ))

    # Bulk create alerts
    if alerts_to_create:
        Alert.objects.bulk_create(alerts_to_create)
        logger.info(f"Created {len(alerts_to_create)} alerts for transaction {instance.id}")


@receiver(post_save, sender=FuelTransaction)
def publish_transaction_event(sender, instance, created, **kwargs):
    """
    Publish event to Redis for realtime updates.
    This is optional and only runs if Redis is available.
    """
    try:
        import json

        import redis
        from django.conf import settings

        redis_url = getattr(settings, 'CELERY_BROKER_URL', None)
        channel = getattr(settings, 'REDIS_PUBSUB_CHANNEL', 'fleetfuel.events')

        if not redis_url:
            return

        r = redis.from_url(redis_url)
        event = {
            'type': 'FUEL_TRANSACTION_CREATED' if created else 'FUEL_TRANSACTION_UPDATED',
            'transaction_id': str(instance.id),
            'vehicle_id': str(instance.vehicle_id),
            'purchased_at': instance.purchased_at.isoformat(),
            'total_cost': str(instance.total_cost),
        }
        r.publish(channel, json.dumps(event))
        logger.debug(f"Published event to Redis: {event['type']}")
    except ImportError:
        pass  # Redis not installed
    except Exception as e:
        logger.warning(f"Could not publish to Redis: {e}")
