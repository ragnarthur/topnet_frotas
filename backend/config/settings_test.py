from .settings import *  # noqa: F403, F401


# Use SQLite for tests to avoid external DB dependencies
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",  # noqa: F405
    }
}

CELERY_BROKER_URL = ""
CELERY_RESULT_BACKEND = ""
REDIS_URL = ""
ALERT_NOTIFICATION_EMAILS = []

MEDIA_ROOT = BASE_DIR / "test_media"  # noqa: F405
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
