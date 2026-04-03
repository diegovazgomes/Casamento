/**
 * map.js
 * Gerencia o mapa interativo usando Leaflet
 */

class WeddingMap {
    constructor() {
        // Coordenadas aproximadas do local (Mansão Ilha de Capri, São Bernardo do Campo)
        this.venueLat = -23.8545;
        this.venueLng = -46.5797;
        this.venueLocation = [this.venueLat, this.venueLng];
        this.venueName = 'Mansão Ilha de Capri';
        this.venueAddress = 'Rodovia Anchieta, SP-150, km 28, São Bernardo do Campo - SP';

        this.initMap();
    }

    initMap() {
        // Verifica se Leaflet está disponível
        if (typeof L === 'undefined') {
            console.error('Leaflet library not loaded');
            return;
        }

        // Cria o mapa
        const map = L.map('map').setView(this.venueLocation, 15);

        // Adiciona a camada de tiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        // Adiciona um marcador no local do casamento
        const marker = L.marker(this.venueLocation, {
            title: this.venueName
        }).addTo(map);

        // Cria um popup com informações do local
        const popupContent = `
            <div class="map-popup">
                <h4>${this.venueName}</h4>
                <p>${this.venueAddress}</p>
                <p style="margin-top: 10px; font-size: 12px; color: #888;">Clique para abrir no Google Maps</p>
            </div>
        `;

        marker.bindPopup(popupContent);

        // Abre o popup por padrão
        marker.openPopup();

        // Customiza o ícone do marcador
        this.customizeMarker(marker);

        // Adiciona click listener para abrir no Google Maps
        marker.on('click', () => {
            this.openInGoogleMaps();
        });

        // Armazena a referência do mapa para uso posterior
        this.map = map;
    }

    customizeMarker(marker) {
        // Cria um ícone customizado (opcional)
        const customIcon = L.icon({
            iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23737373"%3E%3Cpath d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/%3E%3C/svg%3E',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        marker.setIcon(customIcon);
    }

    openInGoogleMaps() {
        const lat = this.venueLat;
        const lng = this.venueLng;
        const url = `https://www.google.com/maps/search/${lat},${lng}`;
        window.open(url, '_blank');
    }

    addCircle() {
        if (!this.map) return;

        // Adiciona um círculo ao redor do local
        L.circle(this.venueLocation, {
            color: '#737373',
            fillColor: '#a6a6a6',
            fillOpacity: 0.2,
            radius: 500
        }).addTo(this.map);
    }
}

// Inicializa o mapa quando o documento carrega
document.addEventListener('DOMContentLoaded', () => {
    const weddingMap = new WeddingMap();
    weddingMap.addCircle();
});
