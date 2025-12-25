"""
Management command to fetch ANP fuel prices.

Usage:
    python manage.py fetch_anp_prices
"""
from django.core.management.base import BaseCommand

from apps.fuel.services import fetch_and_save_anp_prices


class Command(BaseCommand):
    help = 'Fetch and save fuel prices from ANP (Agência Nacional do Petróleo)'

    def handle(self, *args, **options):
        self.stdout.write('Fetching ANP fuel prices...')

        result = fetch_and_save_anp_prices()

        if result['success']:
            self.stdout.write(self.style.SUCCESS('ANP prices updated successfully!'))
            for price in result['prices_updated']:
                self.stdout.write(
                    f"  - {price['fuel_type']}: R$ {price['price']} ({price['action']})"
                )
        else:
            self.stdout.write(self.style.WARNING('ANP price fetch completed with issues:'))

        if result.get('errors'):
            for error in result['errors']:
                self.stdout.write(self.style.ERROR(f"  Error: {error}"))

        if result.get('source_url'):
            self.stdout.write(f"  Source: {result['source_url']}")
