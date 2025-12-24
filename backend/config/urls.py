"""
TopNet Frotas - URL Configuration
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.utils import timezone


def health_check(request):
    return JsonResponse({
        'status': 'ok',
        'service': 'TopNet Frotas API',
        'timestamp': timezone.now().isoformat(),
    })

urlpatterns = [
    path('', health_check),
    path('admin/', admin.site.urls),
    # API endpoints
    path('api/auth/', include('apps.users.urls')),
    path('api/', include('apps.core.urls')),
    path('api/', include('apps.fuel.urls')),
    path('api/', include('apps.alerts.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
