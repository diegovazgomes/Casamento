import { initExtraPage } from './extra-page.js';
import { escapeHtml } from './utils.js';

function renderFaq(items) {
    const container = document.getElementById('faqList');
    if (!container || !Array.isArray(items)) return;

    container.innerHTML = items.map((item) => `
        <article class="faq-item">
            <h2 class="faq-question">${escapeHtml(item.question)}</h2>
            <p class="faq-answer">${escapeHtml(item.answer)}</p>
        </article>
    `).join('');
}

initExtraPage({
    pageKey: 'faq',
    idPrefix: 'faq',
    onReady: (content) => renderFaq(content.items),
});
