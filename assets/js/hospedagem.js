import { setText, escapeHtml } from './utils.js';
import { initExtraPage } from './extra-page.js';

function isSafeUrl(url) {
    try {
        const parsed = new URL(String(url || ''));
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
        return false;
    }
}

function normalizeExternalUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';

    if (isSafeUrl(raw)) {
        return raw;
    }

    const prefixed = `https://${raw.replace(/^\/+/, '')}`;
    return isSafeUrl(prefixed) ? prefixed : '';
}

function renderCards(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container || !Array.isArray(items)) return;

    const defaultLinkLabel = type === 'hotels' ? 'Conferir no mapa' : 'Ver site';

    container.innerHTML = items.map((item) => {
        const normalizedLink = normalizeExternalUrl(item.link);
        const linkHtml = normalizedLink
            ? `<a class="hospedagem-card-link" href="${escapeHtml(normalizedLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(defaultLinkLabel)}</a>`
            : '';

        return `
            <article class="hospedagem-card">
                <h3 class="hospedagem-card-name">${escapeHtml(item.name)}</h3>
                <p class="hospedagem-card-description">${escapeHtml(item.description)}</p>
                ${linkHtml}
            </article>
        `;
    }).join('');
}

initExtraPage({
    pageKey: 'hospedagem',
    idPrefix: 'hospedagem',
    onReady: (content) => {
        setText('hospedagemHotelsTitle', content.hotelsTitle);
        setText('hospedagemRestaurantsTitle', content.restaurantsTitle);
        renderCards('hospedagemHotels', content.hotels, 'hotels');
        renderCards('hospedagemRestaurants', content.restaurants, 'restaurants');
    },
});
