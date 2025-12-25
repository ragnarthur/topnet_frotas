"""
Utility functions for security and validation.
"""
import html
import re


def sanitize_html(value: str) -> str:
    """
    Sanitize string to prevent XSS attacks.
    Escapes HTML special characters.
    """
    if not value:
        return value
    return html.escape(str(value))


def sanitize_text_field(value: str) -> str:
    """
    Sanitize text field for storage.
    Removes potentially dangerous characters and escapes HTML.
    """
    if not value:
        return value

    # Remove null bytes
    value = value.replace('\x00', '')

    # Escape HTML entities
    value = html.escape(value)

    return value.strip()


def validate_plate(plate: str) -> bool:
    """
    Validate Brazilian vehicle plate format.
    Accepts both old (ABC-1234) and Mercosul (ABC1D23) formats.
    """
    if not plate:
        return False

    # Old format: ABC-1234
    old_pattern = r'^[A-Z]{3}-?\d{4}$'
    # Mercosul format: ABC1D23
    mercosul_pattern = r'^[A-Z]{3}\d[A-Z]\d{2}$'

    plate = plate.upper().strip()
    return bool(re.match(old_pattern, plate) or re.match(mercosul_pattern, plate))
