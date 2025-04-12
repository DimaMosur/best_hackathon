let map = L.map('map').setView([50.45, 30.52], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let allMarkers = [];
let allPlaces = [];
let clickedLatLng = null;

const customIcon = L.icon({
  iconUrl: '/static/map/marker.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function calculateAccessibilityScore(place) {
  let score = 0;
  if (place.has_ramp) score += 1;
  if (place.has_tactile) score += 1;
  if (place.has_toilet) score += 1;
  if (place.has_comfortable_exit) score += 1;

  return score;
}

function renderMarkers(places) {
  allMarkers.forEach(m => map.removeLayer(m));
  allMarkers = [];

  places.forEach(place => {
    const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(map);
    allMarkers.push(marker);

    marker.on('click', () => {
      const box = document.getElementById('details-box');
      const stars = '★'.repeat(Math.round(place.rating)) + '☆'.repeat(5 - Math.round(place.rating));

      // Рівень доступності автоматично
      const level = calculateAccessibilityScore(place);
      const colorClass =
        level === 4 ? 'badge-green' :
        level === 3 ? 'badge-yellow' :
        level === 2 ? 'badge-orange' : 'badge-red';

      const reviewsHtml = place.reviews.length > 0
        ? place.reviews.map(r => `<li>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} – ${r.comment}</li>`).join('')
        : '<li>Ще немає відгуків</li>';

      box.innerHTML = `
        <h3>${place.name}</h3>
        <div class="accessibility-circle ${colorClass}">${level}</div>
        <p><strong>Оцінка:</strong> ${stars}</p>
        <p>${place.description}</p>
        <strong>Доступність:</strong>
        <ul class="accessibility-list">
          <li>Пандус: ${place.has_ramp ? '✅' : '❌'}</li>
          <li>Тактильні елементи: ${place.has_tactile ? '✅' : '❌'}</li>
          <li>Адаптований Туалет: ${place.has_toilet ? '✅' : '❌'}</li>
          <li>Зручний вихід: ${place.has_comfortable_exit ? '✅' : '❌'}</li>
        </ul>
        <h4>Відгуки:</h4>
        <ul>${reviewsHtml}</ul>
        <a class="review-button" href="/places/${place.id}/review/">Залишити відгук</a>
      `;

      const editBtn = document.createElement('button');
      editBtn.textContent = "✏ Редагувати місце";
      editBtn.classList.add('review-button');
      editBtn.onclick = () => {
        editingPlaceId = place.id;
        clickedLatLng = { lat: place.lat, lng: place.lng };
        document.getElementById('place-name').value = place.name;
        document.getElementById('place-desc').value = place.description;
        document.getElementById('place-ramp').checked = place.has_ramp;
        document.getElementById('place-tactile').checked = place.has_tactile;
        document.getElementById('place-toilet').checked = place.has_toilet;
        document.getElementById('place-exit').checked = place.has_comfortable_exit;
        document.getElementById('add-place-form').style.display = 'block';
      };
      box.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = "🗑 Видалити місце";
      deleteBtn.classList.add('review-button', 'delete-btn');
      deleteBtn.onclick = () => handleDelete(place.id, marker);
      box.appendChild(deleteBtn);
    });
  });
}

function loadMarkers() {
  fetch('/api/places/')
    .then(res => res.json())
    .then(data => {
      allPlaces = data;
      renderMarkers(data);
    });
}

document.querySelector('.search button').addEventListener('click', () => {
  const value = document.querySelector('.search input').value.toLowerCase().trim();
  if (!value) return;

  const found = allPlaces.find(p => p.name.toLowerCase().includes(value));
  if (found) {
    map.setView([found.lat, found.lng], 16);
    const marker = allMarkers.find(m => {
      const coords = m.getLatLng();
      return coords.lat === found.lat && coords.lng === found.lng;
    });
    if (marker) marker.fire('click');
  } else {
    alert("Місце не знайдено");
  }
});

function handleDelete(placeId, marker) {
  if (!confirm("Точно видалити це місце?")) return;

  fetch(`/api/places/${placeId}/delete/`, {
    method: 'DELETE',
    headers: {
      'X-CSRFToken': getCookie('csrftoken')
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      map.removeLayer(marker);
      alert('Місце було успішно видалене!');
      loadMarkers();  // Reload markers to reflect changes
    } else {
      alert("Помилка при видаленні місця.");
    }
  })
  .catch(error => {
    alert('Виникла помилка при видаленні місця. Спробуйте ще раз.');
    console.error('Error:', error);
  });
}


document.getElementById('add-place-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const data = {
    name: document.getElementById('place-name').value,
    description: document.getElementById('place-desc').value,
    has_ramp: document.getElementById('place-ramp').checked,
    has_tactile_elements: document.getElementById('place-tactile').checked,
    has_adapted_toilet: document.getElementById('place-toilet').checked,
    has_comfortable_exit: document.getElementById('place-exit').checked,
    latitude: clickedLatLng.lat,
    longitude: clickedLatLng.lng
  };

  const url = editingPlaceId
    ? `/api/places/${editingPlaceId}/update/`
    : '/api/places/add/';
  const method = editingPlaceId ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        alert(editingPlaceId ? "Місце оновлено!" : "Місце додано!");
        document.getElementById('add-place-form').reset();
        document.getElementById('add-place-form').style.display = 'none';
        editingPlaceId = null;
        loadMarkers();
      } else {
        alert("Помилка при збереженні місця");
      }
    });
});

document.getElementById('close-form').addEventListener('click', () => {
  document.getElementById('add-place-form').style.display = 'none';
});

document.getElementById('apply-filters').addEventListener('click', () => {
  const ramp = document.getElementById('filter-ramp').checked;
  const toilet = document.getElementById('filter-toilet').checked;
  const tactile = document.getElementById('filter-tactile').checked;
  const exit = document.getElementById('filter-exit').checked;
  const minRating = parseInt(document.getElementById('filter-rating').value);

  const filtered = allPlaces.filter(p =>
    (!ramp || p.has_ramp) &&
    (!toilet || p.has_toilet) &&
    (!tactile || p.has_tactile) &&
    (!exit || p.has_comfortable_exit) &&
    p.rating >= minRating
  );

  renderMarkers(filtered);
  document.getElementById('filter-count').textContent = `Знайдено: ${filtered.length} місць`;
});

document.getElementById('clear-filters').addEventListener('click', () => {
  document.getElementById('filter-ramp').checked = false;
  document.getElementById('filter-toilet').checked = false;
  document.getElementById('filter-tactile').checked = false;
  document.getElementById('filter-exit').checked = false;
  document.getElementById('filter-rating').value = '0';
  document.getElementById('filter-count').textContent = '';
  renderMarkers(allPlaces);
});

map.on('click', function (e) {
  clickedLatLng = e.latlng;
  editingPlaceId = null;
  document.getElementById('add-place-form').reset();
  document.getElementById('add-place-form').style.display = 'block';
});

loadMarkers();
