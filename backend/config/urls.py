"""
TopNet Frotas - URL Configuration
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.utils import timezone
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


def health_check(request):
    return JsonResponse({
        'status': 'ok',
        'service': 'TopNet Frotas API',
        'timestamp': timezone.now().isoformat(),
    })

urlpatterns = [
    path('', health_check),
    path('admin/', admin.site.urls),
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # API endpoints
    path('api/auth/', include('apps.users.urls')),
    path('api/', include('apps.core.urls')),
    path('api/', include('apps.fuel.urls')),
    path('api/', include('apps.alerts.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
