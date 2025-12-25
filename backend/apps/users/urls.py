from django.urls import path

from .views import ThrottledTokenObtainPairView, ThrottledTokenRefreshView

urlpatterns = [
    path('token/', ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', ThrottledTokenRefreshView.as_view(), name='token_refresh'),
]
