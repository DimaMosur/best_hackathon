import json
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .forms import PlaceForm, ReviewForm
from .models import Place


@csrf_exempt
def add_place_api(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        form = PlaceForm(data)
        if form.is_valid():
            place = form.save(commit=False)
            place.latitude = data.get('latitude')
            place.longitude = data.get('longitude')
            place.save()
            print("PLACE CREATED:", place.name, place.latitude, place.longitude)
            return JsonResponse({'success': True, 'place_id': place.id})
        else:
            return JsonResponse({'success': False, 'errors': form.errors}, status=400)

def map_view(request):
    return render(request, 'map/index.html')

def places_api(request):
    places = Place.objects.all()
    data = [
        {
            "id": place.id,
            "name": place.name,
            "lat": place.latitude,
            "lng": place.longitude,
            "description": place.description,
            "rating": place.average_rating(),
            "has_ramp": place.has_ramp,
            "has_tactile": place.has_tactile_elements,
            "has_toilet": place.has_adapted_toilet,
            "reviews": [{"comment": r.comment, "rating": r.rating} for r in place.reviews.all()]
        }
        for place in places
    ]
    return JsonResponse(data, safe=False)


@login_required
def add_review(request, place_id):
    place = get_object_or_404(Place, id=place_id)
    if request.method == 'POST':
        form = ReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False)
            review.user = request.user
            review.place = place
            review.save()
            return redirect('index')
    else:
        form = ReviewForm()
    return render(request, 'places/add_review.html', {'form': form, 'place': place})