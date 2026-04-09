/**
 * map.js
 * Mapa interativo usando Leaflet, integrado à página de hospedagem.
 * Habilitado via event.mapEnabled em site.json.
 */

let mapInitialized = false;
let leafletLoadRetries = 0;
const MAX_LEAFLET_RETRIES = 8;
const LEAFLET_RETRY_DELAY_MS = 250;

function buildEmbedUrl(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
}

function renderEmbedFallback(lat, lng, venueName, mapsLink) {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    const safeTitle = venueName || 'Local do evento';
    const embedUrl = buildEmbedUrl(lat, lng);

    mapEl.innerHTML =
        `<iframe` +
        ` title="${safeTitle}"` +
        ` src="${embedUrl}"` +
        ` loading="lazy"` +
        ` referrerpolicy="no-referrer-when-downgrade"` +
        ` style="width:100%;height:100%;border:0;display:block;"` +
        `></iframe>` +
        `<div class="map-embed-link-wrap">` +
        `<a class="map-popup-link" href="${mapsLink}" target="_blank" rel="noopener noreferrer">Abrir no Google Maps</a>` +
        `</div>`;

    mapInitialized = true;
}

function initLeafletMap(event) {
    if (mapInitialized) return;

    const section = document.getElementById('venueMapSection');
    if (!section) return;

    if (!event.mapEnabled) {
        section.hidden = true;
        return;
    }

    const { lat, lng } = event.venueCoordinates ?? { lat: -23.8545, lng: -46.5797 };
    const venueLocation = [lat, lng];
    const venueName = event.locationName ?? '';
    const venueAddress = event.venueAddress ?? '';
    const mapsLink = event.mapsLink ?? `https://www.google.com/maps/search/${lat},${lng}`;

    section.hidden = false;

    if (typeof L === 'undefined') {
        if (leafletLoadRetries < MAX_LEAFLET_RETRIES) {
            leafletLoadRetries += 1;
            setTimeout(() => initLeafletMap(event), LEAFLET_RETRY_DELAY_MS);
            return;
        }

        console.warn('map.js: Leaflet indisponível. Aplicando fallback de mapa embed.');
        renderEmbedFallback(lat, lng, venueName, mapsLink);
        return;
    }

    const map = L.map('map').setView(venueLocation, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);

    const pinIcon = L.icon({
        iconUrl: 'data:image/svg+xml,%3Csvg xmlns%3D"http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg" viewBox%3D"0 0 24 24" fill%3D"%23737373"%3E%3Cpath d%3D"M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"%2F%3E%3C%2Fsvg%3E',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34],
    });

    const marker = L.marker(venueLocation, { icon: pinIcon, title: venueName }).addTo(map);

    const popup = L.popup({ closeButton: false }).setContent(
        `<div class="map-popup">` +
        `<strong class="map-popup-name">${venueName}</strong>` +
        `<p class="map-popup-address">${venueAddress}</p>` +
        `<a class="map-popup-link" href="${mapsLink}" target="_blank" rel="noopener noreferrer">Abrir no Google Maps</a>` +
        `</div>`
    );

    marker.bindPopup(popup).openPopup();

    L.circle(venueLocation, {
        color: '#737373',
        fillColor: '#a6a6a6',
        fillOpacity: 0.15,
        radius: 400,
        interactive: false,
    }).addTo(map);

    mapInitialized = true;
}

window.addEventListener('app:ready', ({ detail }) => {
    initLeafletMap(detail.config?.event ?? {});
});

// Caso o app:ready já tenha acontecido antes do carregamento deste módulo,
// usa a config global já exposta por script.js.
if (window.CONFIG?.event) {
    initLeafletMap(window.CONFIG.event);
}
