"""
Celery tasks for fuel app.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def fetch_anp_prices_task(self):
    """
    Celery task to fetch and save ANP fuel prices.

    This task is scheduled to run weekly (every Monday at 10:00 AM)
    to fetch the latest fuel price survey from ANP.
    """
    from apps.fuel.services import fetch_and_save_anp_prices

    logger.info("Starting ANP price fetch task")

    try:
        result = fetch_and_save_anp_prices()

        if result['success']:
            logger.info(f"ANP prices updated successfully: {result['prices_updated']}")
        else:
            logger.warning(f"ANP price fetch completed with errors: {result['errors']}")

        return result

    except Exception as exc:
        logger.error(f"ANP price fetch task failed: {exc}")
        raise self.retry(exc=exc, countdown=3600)  # Retry in 1 hour


@shared_task
def test_celery_task():
    """Simple test task to verify Celery is working."""
    logger.info("Celery test task executed successfully")
    return "Celery is working!"
