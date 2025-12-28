"""
Web Application Firewall (WAF) Middleware for Django.

Provides protection against common web attacks:
- SQL Injection
- Cross-Site Scripting (XSS)
- Path Traversal
"""
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
        r"(?i)(union\s+(all\s+)?select)",
        r"(?i)(select\s+.+\s+from\s+)",
        r"(?i)(insert\s+into\s+)",
        r"(?i)(delete\s+from\s+)",
        r"(?i)(drop\s+(table|database|index))",
        r"(?i)(alter\s+table)",
        r"(?i)(exec\s*\(|execute\s+)",
        r"(?i)(update\s+.+\s+set\s+)",
        r"(';\s*--|--\s*$)",
        r"(/\*.*\*/)",
        r"(?i)(or\s+1\s*=\s*1)",
        r"(?i)(and\s+1\s*=\s*1)",
    ]

    # XSS patterns
    XSS_PATTERNS = [
        r"(?i)<script[^>]*>",
        r"(?i)</script>",
        r"(?i)javascript\s*:",
        r"(?i)on(load|error|click|mouse|focus|blur|change|submit)\s*=",
        r"(?i)<iframe[^>]*>",
        r"(?i)<object[^>]*>",
        r"(?i)<embed[^>]*>",
        r"(?i)<svg[^>]*onload",
        r"(?i)expression\s*\(",
        r"(?i)vbscript\s*:",
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
        self.sql_patterns = [re.compile(p) for p in self.SQL_PATTERNS]
        self.xss_patterns = [re.compile(p) for p in self.XSS_PATTERNS]
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

        return self.get_response(request)

    def _is_malicious(self, value: str, request, param_name: str) -> bool:
        """Check if value contains malicious patterns."""
        if not isinstance(value, str) or len(value) < 3:
            return False

        # Decode URL encoding for thorough check
        decoded_value = unquote(value)

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
