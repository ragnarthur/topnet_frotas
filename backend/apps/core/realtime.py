import json
import logging
from uuid import uuid4

import redis
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def publish_event(payload):
    redis_url = getattr(settings, 'REDIS_URL', None) or settings.CELERY_BROKER_URL
    channel = getattr(settings, 'REDIS_PUBSUB_CHANNEL', 'topnet.frotas.events')

    if not redis_url:
        return False

    event = {
        'event_id': str(uuid4()),
        'timestamp': timezone.now().isoformat(),
        **payload,
    }

    try:
        client = redis.from_url(redis_url)
        client.publish(channel, json.dumps(event))
        return True
    except Exception as exc:
        logger.warning('Could not publish event to Redis: %s', exc)
        return False
