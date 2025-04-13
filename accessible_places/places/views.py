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
            #accessibility_score = data.get("accessibility_score", 0)  # за умовчанням 0

            has_ramp = data.get("has_ramp", False)
            has_tactile_elements = data.get("has_tactile_elements", False)
            has_adapted_toilet = data.get("has_adapted_toilet", False)
            has_comfortable_exit = data.get("has_comfortable_exit", False)

            accessibility_score = calculate_accessibility_score({
                'has_ramp': has_ramp,
                'has_tactile_elements': has_tactile_elements,
                'has_adapted_toilet': has_adapted_toilet,
                'has_comfortable_exit': has_comfortable_exit
            })

            if not name or not latitude or not longitude:
                raise ValueError("Missing required fields")

            # Створення об'єкта Place
            place = Place(
                name=name,
                description=description,
                latitude=latitude,
                longitude=longitude,
                has_ramp=has_ramp,
                has_tactile_elements=has_tactile_elements,
                has_adapted_toilet=has_adapted_toilet,
                has_comfortable_exit=has_comfortable_exit,
                accessibility_score=accessibility_score,
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

@login_required
@csrf_exempt
def update_place(request, place_id):
    place = get_object_or_404(Place, pk=place_id)

    if request.user.groups.filter(name='Адміністрація').exists():
        if request.method == 'PUT':
            try:
                data = json.loads(request.body)

                place.name = data.get('name', place.name)
                place.latitude = data.get('latitude', place.latitude)
                place.longitude = data.get('longitude', place.longitude)
                place.description = data.get('description', place.description)
                place.has_ramp = data.get('has_ramp', place.has_ramp)
                place.has_tactile_elements = data.get('has_tactile_elements', place.has_tactile_elements)
                place.has_adapted_toilet = data.get('has_adapted_toilet', place.has_adapted_toilet)
                place.has_comfortable_exit = data.get('has_comfortable_exit', place.has_comfortable_exit)
                place.accessibility_score = calculate_accessibility_score({
                    'has_ramp': place.has_ramp,
                    'has_tactile_elements': place.has_tactile_elements,
                    'has_adapted_toilet': place.has_adapted_toilet,
                    'has_comfortable_exit': place.has_comfortable_exit
                })
                place.save()

                return JsonResponse({'success': True})

            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'error': 'Invalid JSON data'}, status=400)
            except KeyError as e:
                return JsonResponse({'success': False, 'error': f'Missing required field: {e}'}, status=400)
            except Exception as e:
                return JsonResponse({'success': False, 'error': f'An error occurred: {str(e)}'}, status=500)
        else:
            return JsonResponse({'success': False, 'error': 'Invalid HTTP method. Use PUT.'}, status=405)

    else:
        return JsonResponse({'success': False, 'error': 'Unauthorized. You need admin rights.'}, status=403)

def add_proposal(request, place_id):
    place = get_object_or_404(Place, id=place_id)
    if request.method == 'POST':
        proposal = request.POST.get('proposal')
        if proposal:
            if not place.proposals:
                place.proposals = proposal  # Зберігаємо першу пропозицію
            else:
                place.proposals += f"\n{proposal}"  # Додаємо нову пропозицію до існуючих
            place.save()
            return JsonResponse({"success": True, "message": "Пропозиція надіслана"})
        else:
            return JsonResponse({"success": False, "message": "Пропозиція не може бути порожньою"})
    return JsonResponse({"success": False, "message": "Невірний метод запиту"}, status=400)

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

def calculate_accessibility_score(data):
    score = 0
    if data['has_ramp']:
        score += 1
    if data['has_tactile_elements']:
        score += 1
    if data['has_adapted_toilet']:
        score += 1
    if data['has_comfortable_exit']:
        score += 1
    return score

def view_all_proposals(request):
    if not request.user.groups.filter(name='Адміністратор').exists():
        return JsonResponse({"error": "You do not have permission to view this page."}, status=403)

    # Отримуємо всі місця з пропозиціями
    places_with_proposals = Place.objects.filter(proposals__isnull=False)

    # Перетворюємо дані місць у список пропозицій
    proposals_list = []
    for place in places_with_proposals:
        proposals_list.append({
            'name': place.name,
            'proposals': place.proposals.split('\n')  # Розбиваємо пропозиції на список
        })

    return render(request, 'admin/proposals.html', {'proposals_list': proposals_list})

def some_view(request):
    # Перевірка чи є користувач в групі "Адміністратор"
    is_admin = request.user.groups.filter(name='Адміністрація').exists()

    # Передаємо це значення в шаблон
    return render(request, 'index.html', {'is_admin': is_admin})