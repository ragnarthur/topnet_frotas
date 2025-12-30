from django.conf import settings
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .permissions import get_user_role


class LoginRateThrottle(AnonRateThrottle):
    """Rate limit for login attempts to prevent brute force attacks."""
    rate = '5/minute'


@extend_schema(
    tags=['auth'],
    summary='Obter tokens JWT',
    description='Autentica usuário e retorna tokens de acesso e refresh.',
    responses={
        200: inline_serializer(
            name='TokenObtainResponse',
            fields={
                'access': drf_serializers.CharField(help_text='Token de acesso JWT'),
                'refresh': drf_serializers.CharField(help_text='Token de refresh JWT'),
            }
        ),
        401: inline_serializer(name='AuthErrorResponse', fields={'detail': drf_serializers.CharField()}),
    }
)
class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Token obtain view with rate limiting."""
    throttle_classes = [LoginRateThrottle]


@extend_schema(
    tags=['auth'],
    summary='Renovar token de acesso',
    description='Renova o token de acesso usando o token de refresh.',
)
class ThrottledTokenRefreshView(TokenRefreshView):
    """Token refresh view with rate limiting."""
    throttle_classes = [LoginRateThrottle]


def _set_refresh_cookie(response, refresh_token):
    max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=max_age,
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        domain=settings.JWT_COOKIE_DOMAIN,
        path=settings.JWT_COOKIE_PATH,
    )


def _clear_refresh_cookie(response):
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        domain=settings.JWT_COOKIE_DOMAIN,
        path=settings.JWT_COOKIE_PATH,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )


class CookieTokenObtainPairView(ThrottledTokenObtainPairView):
    """Token obtain view that stores refresh token in HttpOnly cookie."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh = response.data.get('refresh')
        if refresh:
            _set_refresh_cookie(response, refresh)
            response.data.pop('refresh', None)
        return response


class CookieTokenRefreshSerializer(TokenRefreshSerializer):
    """Read refresh token from cookie when not provided in request body."""
    refresh = serializers.CharField(required=False)

    def validate(self, attrs):
        if 'refresh' not in attrs or not attrs.get('refresh'):
            refresh = self.context['request'].COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
            if refresh:
                attrs['refresh'] = refresh
        return super().validate(attrs)


class CookieTokenRefreshView(ThrottledTokenRefreshView):
    """Token refresh view that uses HttpOnly cookie for refresh token."""
    serializer_class = CookieTokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh = response.data.get('refresh')
        if refresh:
            _set_refresh_cookie(response, refresh)
            response.data.pop('refresh', None)
        return response


class LogoutView(APIView):
    """Clear refresh token cookie."""
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['auth'],
        summary='Logout',
        description='Limpa o cookie de refresh token.',
        request=None,
        responses={204: None},
    )
    def post(self, request):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        return response


class UserProfileView(APIView):
    """Get current user profile including role and permissions."""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['auth'],
        summary='Perfil do usuário',
        description='Retorna dados do usuário autenticado, incluindo role e informações de motorista se aplicável.',
        responses={
            200: inline_serializer(
                name='UserProfileResponse',
                fields={
                    'id': drf_serializers.IntegerField(),
                    'username': drf_serializers.CharField(),
                    'email': drf_serializers.EmailField(),
                    'first_name': drf_serializers.CharField(),
                    'last_name': drf_serializers.CharField(),
                    'role': drf_serializers.CharField(help_text='admin ou driver'),
                    'is_admin': drf_serializers.BooleanField(),
                    'is_driver': drf_serializers.BooleanField(),
                    'driver': drf_serializers.DictField(allow_null=True, help_text='Dados do motorista (se aplicável)'),
                }
            ),
        }
    )
    def get(self, request):
        user = request.user
        role = get_user_role(user)

        # Base user data
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'is_admin': user.is_staff,
            'is_driver': role == 'driver',
        }

        # Add driver-specific data if user is a driver
        if role == 'driver' and hasattr(user, 'driver_profile'):
            driver = user.driver_profile
            current_vehicle = driver.current_vehicle
            data['driver'] = {
                'id': str(driver.id),
                'name': driver.name,
                'phone': driver.phone,
                'current_vehicle': (
                    {
                        'id': str(current_vehicle.id),
                        'name': current_vehicle.name,
                        'plate': current_vehicle.plate,
                        'fuel_type': current_vehicle.fuel_type,
                    }
                    if current_vehicle else None
                ),
            }

        return Response(data)
