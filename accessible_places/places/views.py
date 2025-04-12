import json
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods

from .forms import PlaceForm, ReviewForm
from .models import Place

def map_view(request):
    return render(request, 'map/index.html')

@csrf_exempt
def add_place_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            name = data.get("name")
            description = data.get("description")
            latitude = data.get("latitude")
            longitude = data.get("longitude")
            accessibility_score = data.get("accessibility_score", 0)  # за умовчанням 0

            # Перевірка, чи всі необхідні поля присутні
            if not name or not latitude or not longitude:
                raise ValueError("Missing required fields")

            # Створення об'єкта Place
            place = Place(
                name=name,
                description=description,
                latitude=latitude,
                longitude=longitude,
                accessibility_score=accessibility_score,
                # додаткові поля, які ви маєте
            )
            place.save()
            return JsonResponse({"success": True})

        except ValueError as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

        except Exception as e:
            return JsonResponse({"success": False, "error": "An error occurred"}, status=500)

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
            "has_comfortable_exit": place.has_comfortable_exit,
            'accessibility_score': place.accessibility_score,
            "reviews": [{"comment": r.comment, "rating": r.rating} for r in place.reviews.all()]
        }
        for place in places
    ]
    return JsonResponse(data, safe=False)

@csrf_exempt
def update_place(request, place_id):
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            place = get_object_or_404(Place, pk=place_id)

            place.name = data.get('name', place.name)
            place.latitude = data.get('latitude', place.latitude)
            place.longitude = data.get('longitude', place.longitude)
            place.description = data.get('description', place.description)
            place.has_ramp = data.get('has_ramp', place.has_ramp)
            place.has_tactile_elements = data.get('has_tactile_elements', place.has_tactile_elements)
            place.has_adapted_toilet = data.get('has_adapted_toilet', place.has_adapted_toilet)
            place.has_comfortable_exit = data.get('has_comfortable_exit', place.has_comfortable_exit)
            place.accessibility_score = calculate_accessibility_score(place)
            place.save()

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    else:
        return JsonResponse({'success': False}, status=400)



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


@require_http_methods(["DELETE"])
@csrf_exempt
def delete_place_api(request, place_id):
    if request.method == 'DELETE':
        place = get_object_or_404(Place, id=place_id)
        place.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Place not found'}, status=400)

def calculate_accessibility_score(place):
    score = 0
    if place.has_ramp:
        score += 1
    if place.has_adapted_toilet:
        score += 1
    if place.has_tactile_elements:
        score += 1
    if place.has_comfortable_exit:
        score += 1
    return score