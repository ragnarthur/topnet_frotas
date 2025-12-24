from django.apps import AppConfig


class FuelConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.fuel'
    verbose_name = 'Combustível'

    def ready(self):
        import apps.fuel.signals  # noqa
