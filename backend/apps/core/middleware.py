"""
Web Application Firewall (WAF) Middleware for Django.

Provides protection against common web attacks:
- SQL Injection
- Cross-Site Scripting (XSS)
- Path Traversal
"""
import json
import logging
import re
from urllib.parse import unquote

from django.http import HttpResponseBadRequest

logger = logging.getLogger('security')


class WAFMiddleware:
    """
    Web Application Firewall middleware that filters malicious requests.

    Detects and blocks:
    - SQL injection attempts
    - XSS (Cross-Site Scripting) attempts
    - Path traversal attempts
    """

    # SQL Injection patterns
    SQL_PATTERNS = [
        r"union\s+select",
        r"union\s+all\s+select",
        r"select\s+.+\s+from",
        r"insert\s+into",
        r"delete\s+from",
        r"drop\s+table",
        r"drop\s+database",
        r"alter\s+table",
        r"update\s+.+\s+set",
        r";\s*--",
        r"--\s*$",
        r"/\*.*\*/",
        r"or\s+['\"]?1['\"]?\s*=\s*['\"]?1['\"]?",
        r"and\s+['\"]?1['\"]?\s*=\s*['\"]?1['\"]?",
        r"pg_sleep\s*\\(",
        r"sleep\s*\\(",
    ]

    # XSS patterns
    XSS_PATTERNS = [
        r"<script",
        r"</script>",
        r"javascript:",
        r"onload\s*=",
        r"onerror\s*=",
        r"onclick\s*=",
        r"onmouseover\s*=",
        r"<iframe",
        r"<object",
        r"<embed",
        r"vbscript:",
    ]

    # Path traversal patterns
    PATH_PATTERNS = [
        r"\.\./",
        r"\.\.\\",
        r"%2e%2e/",
        r"%2e%2e\\",
        r"\.\.%2f",
        r"\.\.%5c",
        r"%252e%252e",
    ]

    # Whitelist paths that should skip WAF checks (e.g., static files)
    WHITELIST_PATHS = [
        '/static/',
        '/media/',
        '/favicon.ico',
    ]

    def __init__(self, get_response):
        self.get_response = get_response
        self.sql_patterns = [re.compile(p, re.IGNORECASE) for p in self.SQL_PATTERNS]
        self.xss_patterns = [re.compile(p, re.IGNORECASE) for p in self.XSS_PATTERNS]
        self.path_patterns = [re.compile(p, re.IGNORECASE) for p in self.PATH_PATTERNS]

    def __call__(self, request):
        # Skip whitelisted paths
        if any(request.path.startswith(path) for path in self.WHITELIST_PATHS):
            return self.get_response(request)

        # Check for path traversal in URL
        if self._check_path_traversal(request.path):
            return self._block_request(request, 'path_traversal', request.path)

        # Check query parameters
        for key, value in request.GET.items():
            if self._is_malicious(value, request, key):
                return self._block_request(request, 'query_param', f"{key}={value[:50]}")

        # Check POST data (only for form data, not file uploads)
        if request.method == 'POST' and request.content_type in ['application/x-www-form-urlencoded', 'multipart/form-data']:
            for key, value in request.POST.items():
                if isinstance(value, str) and self._is_malicious(value, request, key):
                    return self._block_request(request, 'post_data', f"{key}={value[:50]}")

        # Check JSON payloads
        if request.method in ['POST', 'PUT', 'PATCH'] and 'application/json' in request.content_type:
            if self._check_json_body(request):
                return self._block_request(request, 'json_body', 'payload')

        return self.get_response(request)

    def _is_malicious(self, value: str, request, param_name: str) -> bool:
        """Check if value contains malicious patterns."""
        if not isinstance(value, str) or len(value) < 3:
            return False

        # Decode URL encoding for thorough check
        decoded_value = value
        for _ in range(2):
            next_value = unquote(decoded_value)
            if next_value == decoded_value:
                break
            decoded_value = next_value

        # Check SQL injection
        for pattern in self.sql_patterns:
            if pattern.search(decoded_value):
                logger.warning(
                    f"SQL Injection attempt blocked - IP: {self._get_client_ip(request)}, "
                    f"Path: {request.path}, Param: {param_name}"
                )
                return True

        # Check XSS
        for pattern in self.xss_patterns:
            if pattern.search(decoded_value):
                logger.warning(
                    f"XSS attempt blocked - IP: {self._get_client_ip(request)}, "
                    f"Path: {request.path}, Param: {param_name}"
                )
                return True

        return False

    def _check_path_traversal(self, path: str) -> bool:
        """Check if path contains traversal attempts."""
        decoded_path = unquote(path).lower()

        for pattern in self.path_patterns:
            if pattern.search(decoded_path):
                logger.warning(
                    f"Path Traversal attempt blocked - Path: {path}"
                )
                return True

        return False

    def _check_json_body(self, request) -> bool:
        try:
            raw_body = request.body
        except Exception:
            return False

        if not raw_body:
            return False

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return False

        for value in self._iter_json_strings(payload):
            if self._is_malicious(value, request, 'json'):
                return True

        return False

    def _iter_json_strings(self, payload):
        if isinstance(payload, dict):
            for value in payload.values():
                yield from self._iter_json_strings(value)
        elif isinstance(payload, list):
            for value in payload:
                yield from self._iter_json_strings(value)
        elif isinstance(payload, str):
            yield payload

    def _block_request(self, request, attack_type: str, details: str):
        """Block malicious request and return error response."""
        client_ip = self._get_client_ip(request)

        logger.warning(
            f"WAF BLOCK - Type: {attack_type}, IP: {client_ip}, "
            f"Path: {request.path}, Details: {details}"
        )

        return HttpResponseBadRequest(
            content='Request blocked by security filter.',
            content_type='text/plain'
        )

    @staticmethod
    def _get_client_ip(request) -> str:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')
