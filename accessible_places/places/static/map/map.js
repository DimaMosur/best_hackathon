// Ініціалізація мапи
let map = L.map('map').setView([50.45, 30.52], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Кастомна іконка
const customIcon = L.icon({
  iconUrl: '/static/map/marker.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Масив для збереження всіх маркерів
let markers = [];

// Завантаження маркерів з API
function loadMarkers() {
  // Видалити старі маркери
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  fetch('/api/places/')
    .then(response => response.json())
    .then(data => {
      data.forEach(place => {
        const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(map);
        markers.push(marker);

        marker.on('click', () => {
          const box = document.getElementById('details-box');
          const stars = '★'.repeat(Math.round(place.rating)) + '☆'.repeat(5 - Math.round(place.rating));
          const reviewsHtml = place.reviews.length > 0
            ? place.reviews.map(r => `<li>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} – ${r.comment}</li>`).join('')
            : '<li>Ще немає відгуків</li>';

          box.innerHTML = `
            <h3>${place.name}</h3>
            <p><strong>Оцінка:</strong> ${stars}</p>
            <p>${place.description}</p>
            <p><strong>Доступність:</strong><br>
              Пандус: ${place.has_ramp ? '✅' : '❌'}<br>
              Тактильні елементи: ${place.has_tactile ? '✅' : '❌'}<br>
              Туалет: ${place.has_toilet ? '✅' : '❌'}
            </p>
            <h4>Відгуки:</h4>
            <ul>${reviewsHtml}</ul>
            <a class="review-button" href="/places/${place.id}/review/">Залишити відгук</a>
          `;
        });
      });
    });
}

// Пошук місця
document.querySelector('button').addEventListener('click', () => {
  const value = document.querySelector('input').value.toLowerCase();
  fetch('/api/places/')
    .then(res => res.json())
    .then(data => {
      const found = data.find(p => p.name.toLowerCase().includes(value));
      if (found) map.setView([found.lat, found.lng], 16);
      else alert("Не знайдено");
    });
});

// Клік по карті — відкриття форми додавання
let clickedLatLng = null;
map.on('click', function(e) {
  clickedLatLng = e.latlng;
  const form = document.getElementById('add-place-form');
  form.style.display = 'block';
});

// Закриття форми по ✖
document.getElementById('close-form').addEventListener('click', () => {
  document.getElementById('add-place-form').style.display = 'none';
});

// Обробка форми "Додати місце"
document.getElementById('add-place-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const data = {
    name: document.getElementById('place-name').value,
    description: document.getElementById('place-desc').value,
    has_ramp: document.getElementById('place-ramp').checked,
    has_tactile_elements: document.getElementById('place-tactile').checked,
    has_adapted_toilet: document.getElementById('place-toilet').checked,
    latitude: clickedLatLng.lat,
    longitude: clickedLatLng.lng
  };

  fetch('/api/places/add/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(json => {
    if (json.success) {
      alert("Місце додано!");
      document.getElementById('add-place-form').reset();
      document.getElementById('add-place-form').style.display = 'none';
      loadMarkers();  // перезавантажити маркери
    } else {
      alert("Помилка при додаванні місця");
    }
  });
});

// Отримання CSRF-токена з cookie
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

// Перший запуск
loadMarkers();
