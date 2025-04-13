let map = L.map('map').setView([49.84, 24.02], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let allMarkers = [];
let allPlaces = [];
let clickedLatLng = null;
let currentRole = 'Користувач';

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
      if (currentRole === 'Адміністратор') {
        editBtn.textContent = "✏ Редагувати місце";
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
      } else {
        editBtn.textContent = "Внести пропозицію";
        editBtn.classList.add('proposal-button');
        editBtn.onclick = () => {
          editingPlaceId = place.id;
          clickedLatLng = { lat: place.lat, lng: place.lng };
          document.getElementById('place-name').value = place.name;
          document.getElementById('place-desc').value = place.description;
          document.getElementById('add-place-form').style.display = 'block';
        };
      }

      box.appendChild(editBtn);

      // Admin can delete
      if (currentRole === 'Адміністратор') {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "🗑 Видалити місце";
        deleteBtn.classList.add('review-button', 'delete-btn');
        deleteBtn.onclick = () => handleDelete(place.id, marker);
        box.appendChild(deleteBtn);
      }
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

document.querySelector('#searchb').addEventListener('click', () => {
  const value_dest = document.querySelector('#dest').value.toLowerCase().trim();
  const value_start = document.querySelector('#start').value.toLowerCase().trim();

  if (!value_dest && !value_start) {
    alert("Пошук пустий");
    return;
  }

  const found_dest = value_dest ? allPlaces.find(p => p.name.toLowerCase().includes(value_dest)) : null;
  const found_start = value_start ? allPlaces.find(p => p.name.toLowerCase().includes(value_start)) : null;

  if (found_dest && found_start) {
    if (window.routingControl) {
      map.removeControl(window.routingControl);
    }

    window.routingControl = L.Routing.control({
      waypoints: [
        L.latLng(found_start.lat, found_start.lng),
        L.latLng(found_dest.lat, found_dest.lng)
      ],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      routeWhileDragging: true,
      fitSelectedRoutes: true,
    }).addTo(map);
  } else if (found_dest) {
    map.setView([found_dest.lat, found_dest.lng], 16);
    const marker = allMarkers.find(m => {
      const coords = m.getLatLng();
      return coords.lat === found_dest.lat && coords.lng === found_dest.lng;
    });
    if (marker) marker.fire('click');
  } else if (found_start) {
    map.setView([found_start.lat, found_start.lng], 16);
    const marker = allMarkers.find(m => {
      const coords = m.getLatLng();
      return coords.lat === found_start.lat && coords.lng === found_start.lng;
    });
    if (marker) marker.fire('click');
  } else {
    alert("Місць не знайдено");
    return;
  }
});

document.querySelector('#dismiss').addEventListener('click', () => {
  if (window.routingControl) {
    map.removeControl(window.routingControl);
  }
  document.querySelector('#dest').value = '';
  document.querySelector('#start').value = '';
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
        document.getElementById('details-box').innerHTML = 'Місце видалено.';
        loadMarkers();
      } else {
        alert("Помилка при видаленні місця.");
      }
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
    })
      .catch(error => {
        console.error('Помилка запиту:', error)
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

document.addEventListener("DOMContentLoaded", function () {  // Переконаймося, що DOM повністю завантажено
  const roleButton = document.getElementById('role-button');
  const roleDropdown = document.getElementById('role-dropdown');
  const userRole = document.getElementById('user-role');
  const adminRole = document.getElementById('admin-role');


  if (roleButton) {
    console.log("Role button found!");
    roleButton.addEventListener('click', function () {
      console.log('Role button clicked!');
      roleDropdown.style.display = roleDropdown.style.display === 'block' ? 'none' : 'block';
    });
  } else {
    console.error("Role button not found!");
  }

  if (userRole) {
    userRole.addEventListener('click', function () {
      console.log('User role selected');
      setRole('Користувач');
    });
  } else {
    console.error("User role button not found!");
  }

  if (adminRole) {
    adminRole.addEventListener('click', function () {
      console.log('Admin role selected');
      setRole('Адміністратор');
    });
  } else {
    console.error("Admin role button not found!");
  }
});

function setRole(role) {
  console.log(`Setting role to: ${role}`);
  currentRole = role;
  const roleButton = document.getElementById('role-button');
  const roleDropdown = document.getElementById('role-dropdown');

  if (roleButton && roleDropdown) {
    roleButton.innerHTML = `Роль: ${role}`;
    roleDropdown.style.display = 'none'; // Закриваємо випадаюче меню після вибору

    if (currentRole === 'Адміністратор') {
      document.getElementById('edit-place-button').style.display = 'inline-block'; // Показати кнопку для адміністраторів
      document.getElementById('suggest-place-button').style.display = 'none'; // Приховати для користувача
    } else {
      document.getElementById('edit-place-button').style.display = 'none'; // Приховати для адміністраторів
      document.getElementById('suggest-place-button').style.display = 'inline-block'; // Показати для користувача
    }
  } else {
    console.error("Elements for role setting are not found.");
  }
}

document.getElementById('add-place-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const data = {
    proposal: document.getElementById('place-desc').value // Просто використовуємо поле для опису пропозиції
  };

  fetch(`/api/places/${editingPlaceId}/proposal/`, {
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
        alert("Пропозиція надіслана!");
        document.getElementById('add-place-form').reset();
        document.getElementById('add-place-form').style.display = 'none';
        editingPlaceId = null;
      } else {
        alert("Помилка при надсиланні пропозиції");
      }
    })
    .catch(error => {
      console.error('Помилка запиту:', error)
    });
});