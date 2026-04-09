import { revealElements, setText } from './utils.js';

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

window.addEventListener('app:ready', ({ detail }) => {
    const content = detail.config?.pages?.hospedagem?.content;
    if (!content) return;

    setText('hospedagemTag', content.tag);
    setText('hospedagemTitle', content.title);
    setText('hospedagemIntro', content.intro);
    setText('hospedagemHotelsTitle', content.hotelsTitle);
    setText('hospedagemRestaurantsTitle', content.restaurantsTitle);
    renderCards('hospedagemHotels', content.hotels);
    renderCards('hospedagemRestaurants', content.restaurants);

    revealElements('.reveal');
});
