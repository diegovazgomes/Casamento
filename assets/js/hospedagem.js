import { setText } from './utils.js';
import { initExtraPage } from './extra-page.js';

function renderCards(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container || !Array.isArray(items)) return;

    container.innerHTML = items.map((item) => {
        const linkHtml = item.link
            ? `<a class="hospedagem-card-link" href="${item.link}" target="_blank" rel="noopener noreferrer">${item.linkLabel ?? 'Ver mais'}</a>`
            : '';

        return `
            <article class="hospedagem-card">
                <h3 class="hospedagem-card-name">${item.name ?? ''}</h3>
                <p class="hospedagem-card-description">${item.description ?? ''}</p>
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
        renderCards('hospedagemHotels', content.hotels);
        renderCards('hospedagemRestaurants', content.restaurants);
    },
});
