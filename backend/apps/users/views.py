from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class LoginRateThrottle(AnonRateThrottle):
    """Rate limit for login attempts to prevent brute force attacks."""
    rate = '5/minute'


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Token obtain view with rate limiting."""
    throttle_classes = [LoginRateThrottle]


class ThrottledTokenRefreshView(TokenRefreshView):
    """Token refresh view with rate limiting."""
    throttle_classes = [LoginRateThrottle]
