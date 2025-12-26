"""
CSV Importer for Fuel Transactions.

Robust importer with:
- Brazilian format support (decimal with comma, DD/MM/YYYY dates)
- Line-by-line validation with detailed error messages
- Deduplication by (vehicle, purchased_at, liters, total_cost)
- Comprehensive import report
"""
import csv
import io
import re
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import BinaryIO

from django.db import transaction
from django.utils import timezone

from apps.core.models import CostCenter, Driver, FuelStation, FuelType, Vehicle
from apps.fuel.models import FuelTransaction


# CSV Column specification
CSV_COLUMNS = [
    'data',           # Required: DD/MM/YYYY or DD/MM/YYYY HH:MM
    'placa',          # Required: Vehicle plate
    'litros',         # Required: Liters (decimal, Brazilian format allowed)
    'preco_litro',    # Required: Price per liter (decimal)
    'total',          # Optional: Total cost (auto-calculated if empty)
    'odometro',       # Required: Odometer in km (integer)
    'combustivel',    # Optional: GASOLINA, ETANOL, DIESEL (default: GASOLINA)
    'motorista',      # Optional: Driver name (exact match)
    'posto',          # Optional: Station name (exact match)
    'centro_custo',   # Optional: Cost center name (exact match)
    'observacoes',    # Optional: Notes
]

FUEL_TYPE_MAP = {
    'GASOLINA': FuelType.GASOLINE,
    'GASOLINE': FuelType.GASOLINE,
    'GAS': FuelType.GASOLINE,
    'G': FuelType.GASOLINE,
    'ETANOL': FuelType.ETHANOL,
    'ETHANOL': FuelType.ETHANOL,
    'ALCOOL': FuelType.ETHANOL,
    'E': FuelType.ETHANOL,
    'DIESEL': FuelType.DIESEL,
    'D': FuelType.DIESEL,
}


@dataclass
class ImportError:
    """Single import error."""
    row: int
    column: str
    value: str
    message: str


@dataclass
class ImportedTransaction:
    """Successfully imported transaction."""
    row: int
    transaction_id: str
    vehicle_plate: str
    purchased_at: str
    liters: str
    total_cost: str


@dataclass
class ImportResult:
    """Result of CSV import operation."""
    success: bool = True
    total_rows: int = 0
    imported_count: int = 0
    skipped_count: int = 0  # Duplicates
    error_count: int = 0
    errors: list = field(default_factory=list)
    imported: list = field(default_factory=list)
    skipped: list = field(default_factory=list)

    def add_error(self, row: int, column: str, value: str, message: str):
        self.errors.append(ImportError(row, column, value, message))
        self.error_count += 1

    def add_imported(self, row: int, tx: FuelTransaction):
        self.imported.append(ImportedTransaction(
            row=row,
            transaction_id=str(tx.id),
            vehicle_plate=tx.vehicle.plate,
            purchased_at=tx.purchased_at.strftime('%d/%m/%Y %H:%M'),
            liters=str(tx.liters),
            total_cost=str(tx.total_cost),
        ))
        self.imported_count += 1

    def add_skipped(self, row: int, reason: str):
        self.skipped.append({'row': row, 'reason': reason})
        self.skipped_count += 1

    def to_dict(self):
        return {
            'success': self.success and self.error_count == 0,
            'summary': {
                'total_rows': self.total_rows,
                'imported': self.imported_count,
                'skipped': self.skipped_count,
                'errors': self.error_count,
            },
            'imported': [
                {
                    'row': i.row,
                    'transaction_id': i.transaction_id,
                    'vehicle_plate': i.vehicle_plate,
                    'purchased_at': i.purchased_at,
                    'liters': i.liters,
                    'total_cost': i.total_cost,
                }
                for i in self.imported
            ],
            'skipped': self.skipped,
            'errors': [
                {
                    'row': e.row,
                    'column': e.column,
                    'value': e.value,
                    'message': e.message,
                }
                for e in self.errors
            ],
        }


def parse_brazilian_decimal(value: str) -> Decimal | None:
    """
    Parse a decimal value in Brazilian format.

    Accepts:
    - 1234,56 (Brazilian)
    - 1.234,56 (Brazilian with thousands separator)
    - 1234.56 (International)
    - 1,234.56 (International with thousands separator)
    """
    if not value or not value.strip():
        return None

    value = value.strip()

    # Remove currency symbols and spaces
    value = re.sub(r'[R$\s]', '', value)

    # Detect format based on last separator
    if ',' in value and '.' in value:
        # Both separators present
        last_comma = value.rfind(',')
        last_dot = value.rfind('.')

        if last_comma > last_dot:
            # Brazilian: 1.234,56 -> 1234.56
            value = value.replace('.', '').replace(',', '.')
        else:
            # International: 1,234.56 -> 1234.56
            value = value.replace(',', '')
    elif ',' in value:
        # Only comma - assume Brazilian decimal separator
        # But check if it could be thousands separator (e.g., "1,000")
        parts = value.split(',')
        if len(parts) == 2 and len(parts[1]) <= 2:
            # Likely decimal: 1234,56
            value = value.replace(',', '.')
        elif len(parts) == 2 and len(parts[1]) == 3:
            # Ambiguous: could be 1,234 (thousands) or 1,234 (decimal with 3 places)
            # For fuel, 3 decimal places is common for liters, so treat as decimal
            value = value.replace(',', '.')
        else:
            # Multiple commas or other patterns - treat commas as thousands
            value = value.replace(',', '')
    # If only dots or no separator, use as-is (already international format)

    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def parse_date(value: str) -> datetime | None:
    """
    Parse a date/datetime string.

    Accepts:
    - DD/MM/YYYY
    - DD/MM/YYYY HH:MM
    - DD/MM/YYYY HH:MM:SS
    - DD-MM-YYYY
    - YYYY-MM-DD
    - YYYY-MM-DD HH:MM:SS
    """
    if not value or not value.strip():
        return None

    value = value.strip()

    formats = [
        '%d/%m/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%d/%m/%Y',
        '%d-%m-%Y %H:%M:%S',
        '%d-%m-%Y %H:%M',
        '%d-%m-%Y',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%Y-%m-%d',
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(value, fmt)
            # Make timezone aware
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt)
            return dt
        except ValueError:
            continue

    return None


def parse_integer(value: str) -> int | None:
    """Parse an integer value, removing any non-numeric characters."""
    if not value or not value.strip():
        return None

    value = value.strip()
    # Remove common formatting (spaces, dots as thousands separator)
    value = re.sub(r'[.\s]', '', value)

    try:
        return int(value)
    except ValueError:
        return None


def parse_fuel_type(value: str) -> str:
    """Parse fuel type from various formats."""
    if not value or not value.strip():
        return FuelType.GASOLINE

    normalized = value.strip().upper()
    return FUEL_TYPE_MAP.get(normalized, FuelType.GASOLINE)


def detect_delimiter(sample: str) -> str:
    """Detect CSV delimiter from a sample."""
    # Count occurrences of common delimiters
    delimiters = [';', ',', '\t', '|']
    counts = {d: sample.count(d) for d in delimiters}

    # Return the most common one, defaulting to semicolon (common in Brazilian CSV)
    return max(counts, key=counts.get) if any(counts.values()) else ';'


def import_fuel_transactions(file_content: bytes | str | BinaryIO, encoding: str = 'utf-8') -> ImportResult:
    """
    Import fuel transactions from a CSV file.

    Args:
        file_content: CSV content as bytes, string, or file-like object
        encoding: File encoding (default: utf-8, also try latin-1 for Brazilian files)

    Returns:
        ImportResult with detailed information about the import
    """
    result = ImportResult()

    # Handle different input types
    if isinstance(file_content, bytes):
        try:
            content = file_content.decode(encoding)
        except UnicodeDecodeError:
            # Try latin-1 as fallback for Brazilian files
            try:
                content = file_content.decode('latin-1')
            except UnicodeDecodeError:
                result.success = False
                result.add_error(0, 'file', '', 'Encoding nao suportado. Use UTF-8 ou ISO-8859-1.')
                return result
    elif hasattr(file_content, 'read'):
        raw = file_content.read()
        if isinstance(raw, bytes):
            try:
                content = raw.decode(encoding)
            except UnicodeDecodeError:
                content = raw.decode('latin-1')
        else:
            content = raw
    else:
        content = file_content

    # Detect delimiter from first line
    first_line = content.split('\n')[0] if content else ''
    delimiter = detect_delimiter(first_line)

    # Parse CSV
    reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)

    # Normalize field names (lowercase, strip, replace spaces)
    if reader.fieldnames:
        field_map = {}
        for orig_name in reader.fieldnames:
            normalized = orig_name.lower().strip()
            normalized = re.sub(r'[^a-z0-9_]', '_', normalized)
            normalized = re.sub(r'_+', '_', normalized).strip('_')
            field_map[orig_name] = normalized
    else:
        result.success = False
        result.add_error(0, 'file', '', 'Arquivo CSV vazio ou sem cabecalho.')
        return result

    # Pre-fetch lookup tables for performance
    vehicles = {v.plate.upper(): v for v in Vehicle.objects.filter(active=True)}
    drivers = {d.name.upper(): d for d in Driver.objects.filter(active=True)}
    stations = {s.name.upper(): s for s in FuelStation.objects.filter(active=True)}
    cost_centers = {c.name.upper(): c for c in CostCenter.objects.filter(active=True)}

    rows_to_import = []

    # First pass: validate all rows
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        result.total_rows += 1

        # Normalize row keys
        normalized_row = {field_map.get(k, k): v for k, v in row.items()}

        row_errors = []

        # Parse required fields
        # Date
        date_value = normalized_row.get('data', '') or normalized_row.get('data_hora', '')
        purchased_at = parse_date(date_value)
        if not purchased_at:
            row_errors.append(('data', date_value, 'Data invalida. Use DD/MM/YYYY ou DD/MM/YYYY HH:MM.'))

        # Vehicle plate
        plate_value = (normalized_row.get('placa', '') or '').strip().upper()
        vehicle = vehicles.get(plate_value)
        if not plate_value:
            row_errors.append(('placa', '', 'Placa e obrigatoria.'))
        elif not vehicle:
            row_errors.append(('placa', plate_value, f'Veiculo com placa "{plate_value}" nao encontrado.'))

        # Liters
        liters_value = normalized_row.get('litros', '')
        liters = parse_brazilian_decimal(liters_value)
        if liters is None:
            row_errors.append(('litros', liters_value, 'Litros invalido. Use formato numerico (ex: 45,5 ou 45.5).'))
        elif liters <= 0:
            row_errors.append(('litros', liters_value, 'Litros deve ser maior que zero.'))

        # Price per liter
        price_value = normalized_row.get('preco_litro', '') or normalized_row.get('preco', '')
        unit_price = parse_brazilian_decimal(price_value)
        if unit_price is None:
            row_errors.append(('preco_litro', price_value, 'Preco por litro invalido.'))
        elif unit_price <= 0:
            row_errors.append(('preco_litro', price_value, 'Preco deve ser maior que zero.'))

        # Total (optional - will be calculated)
        total_value = normalized_row.get('total', '') or normalized_row.get('valor_total', '')
        total_cost = parse_brazilian_decimal(total_value) if total_value else None

        # Odometer
        odometer_value = normalized_row.get('odometro', '') or normalized_row.get('km', '')
        odometer_km = parse_integer(odometer_value)
        if odometer_km is None:
            row_errors.append(('odometro', odometer_value, 'Odometro invalido. Use numero inteiro.'))
        elif odometer_km < 0:
            row_errors.append(('odometro', odometer_value, 'Odometro nao pode ser negativo.'))

        # Optional fields
        fuel_type_value = normalized_row.get('combustivel', '') or normalized_row.get('tipo_combustivel', '')
        fuel_type = parse_fuel_type(fuel_type_value)

        driver_value = (normalized_row.get('motorista', '') or '').strip().upper()
        driver = drivers.get(driver_value) if driver_value else None

        station_value = (normalized_row.get('posto', '') or '').strip().upper()
        station = stations.get(station_value) if station_value else None

        cost_center_value = (normalized_row.get('centro_custo', '') or normalized_row.get('cc', '') or '').strip().upper()
        cost_center = cost_centers.get(cost_center_value) if cost_center_value else None

        notes = (normalized_row.get('observacoes', '') or normalized_row.get('obs', '') or '').strip()

        # Record errors for this row
        if row_errors:
            for col, val, msg in row_errors:
                result.add_error(row_num, col, val, msg)
            continue

        # Prepare row for import
        rows_to_import.append({
            'row_num': row_num,
            'vehicle': vehicle,
            'driver': driver,
            'station': station,
            'cost_center': cost_center,
            'purchased_at': purchased_at,
            'liters': liters,
            'unit_price': unit_price,
            'total_cost': total_cost,
            'odometer_km': odometer_km,
            'fuel_type': fuel_type,
            'notes': notes,
        })

    # If there are errors, don't proceed with import
    if result.error_count > 0:
        result.success = False
        return result

    # Second pass: import with deduplication
    with transaction.atomic():
        for row_data in rows_to_import:
            row_num = row_data['row_num']
            vehicle = row_data['vehicle']
            purchased_at = row_data['purchased_at']
            liters = row_data['liters']

            # Calculate total_cost if not provided
            total_cost = row_data['total_cost']
            if total_cost is None:
                total_cost = liters * row_data['unit_price']

            # Check for duplicate
            existing = FuelTransaction.objects.filter(
                vehicle=vehicle,
                purchased_at=purchased_at,
                liters=liters,
            ).first()

            if existing:
                # Also check if total_cost matches (allow 1 cent tolerance)
                if abs(existing.total_cost - total_cost) < Decimal('0.02'):
                    result.add_skipped(row_num, f'Duplicado: {vehicle.plate} em {purchased_at.strftime("%d/%m/%Y %H:%M")}')
                    continue

            # Create transaction
            tx = FuelTransaction.objects.create(
                vehicle=vehicle,
                driver=row_data['driver'],
                station=row_data['station'],
                cost_center=row_data['cost_center'],
                purchased_at=purchased_at,
                liters=liters,
                unit_price=row_data['unit_price'],
                total_cost=total_cost,
                odometer_km=row_data['odometer_km'],
                fuel_type=row_data['fuel_type'],
                notes=row_data['notes'],
            )

            result.add_imported(row_num, tx)

    return result


def generate_csv_template() -> str:
    """Generate a CSV template with example data."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    # Header
    writer.writerow(CSV_COLUMNS)

    # Example rows
    writer.writerow([
        '15/01/2025 08:30',  # data
        'ABC-1234',          # placa
        '45,5',              # litros
        '5,89',              # preco_litro
        '',                  # total (deixar vazio para calcular automatico)
        '125430',            # odometro
        'GASOLINA',          # combustivel
        'Joao Silva',        # motorista (opcional)
        'Posto Shell Centro', # posto (opcional)
        'Urbano',            # centro_custo (opcional)
        'Abastecimento rotina', # observacoes (opcional)
    ])
    writer.writerow([
        '16/01/2025 14:15',
        'XYZ-5678',
        '38,750',
        '6,459',
        '250,49',
        '89200',
        'ETANOL',
        '',
        'Ipiranga BR-101',
        'Rural',
        '',
    ])

    return output.getvalue()


def get_csv_format_specification() -> dict:
    """Return the CSV format specification for documentation."""
    return {
        'encoding': 'UTF-8 ou ISO-8859-1 (Latin-1)',
        'delimiter': 'Ponto-e-virgula (;) ou virgula (,)',
        'decimal_separator': 'Virgula (,) ou ponto (.) - ambos sao aceitos',
        'date_formats': [
            'DD/MM/YYYY',
            'DD/MM/YYYY HH:MM',
            'DD/MM/YYYY HH:MM:SS',
            'YYYY-MM-DD',
        ],
        'columns': [
            {
                'name': 'data',
                'required': True,
                'description': 'Data e hora do abastecimento',
                'example': '15/01/2025 08:30',
            },
            {
                'name': 'placa',
                'required': True,
                'description': 'Placa do veiculo (deve estar cadastrado)',
                'example': 'ABC-1234',
            },
            {
                'name': 'litros',
                'required': True,
                'description': 'Quantidade de litros abastecidos',
                'example': '45,5',
            },
            {
                'name': 'preco_litro',
                'required': True,
                'description': 'Preco por litro do combustivel',
                'example': '5,89',
            },
            {
                'name': 'total',
                'required': False,
                'description': 'Valor total (calculado automaticamente se vazio)',
                'example': '267,99',
            },
            {
                'name': 'odometro',
                'required': True,
                'description': 'Leitura do odometro em km',
                'example': '125430',
            },
            {
                'name': 'combustivel',
                'required': False,
                'description': 'Tipo de combustivel (GASOLINA, ETANOL, DIESEL)',
                'example': 'GASOLINA',
                'default': 'GASOLINA',
            },
            {
                'name': 'motorista',
                'required': False,
                'description': 'Nome do motorista (deve estar cadastrado)',
                'example': 'Joao Silva',
            },
            {
                'name': 'posto',
                'required': False,
                'description': 'Nome do posto (deve estar cadastrado)',
                'example': 'Posto Shell Centro',
            },
            {
                'name': 'centro_custo',
                'required': False,
                'description': 'Nome do centro de custo (deve estar cadastrado)',
                'example': 'Urbano',
            },
            {
                'name': 'observacoes',
                'required': False,
                'description': 'Observacoes adicionais',
                'example': 'Abastecimento rotina',
            },
        ],
        'notes': [
            'A primeira linha deve conter os nomes das colunas (cabecalho).',
            'Linhas duplicadas (mesma placa, data e litros) sao ignoradas automaticamente.',
            'Veiculos, motoristas, postos e centros de custo devem estar cadastrados previamente.',
            'O campo "total" e calculado automaticamente se deixado vazio.',
            'Formatos de data flexiveis: DD/MM/YYYY ou YYYY-MM-DD, com ou sem horario.',
        ],
    }
