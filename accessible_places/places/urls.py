from django.urls import path
from . import views

urlpatterns = [
    path('', views.map_view, name='index'),
    path('api/places/', views.places_api, name='places_api'),
    path('places/<int:place_id>/review/', views.add_review, name='add_review'),
    path('api/places/add/', views.add_place_api, name='add_place_api'),
    path('api/places/<int:place_id>/delete/', views.delete_place_api, name='delete_place'),
    path('api/places/<int:place_id>/update/', views.update_place, name='update_place'),

    ]
