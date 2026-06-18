import { initExtraPage } from './extra-page.js';
import { escapeHtml } from './utils.js';

function renderFaq(items) {
    const container = document.getElementById('faqList');
    if (!container || !Array.isArray(items)) return;

    container.innerHTML = items.map((item, index) => {
        const answerId = `faqAnswer${index + 1}`;

        return `
        <article class="faq-item">
            <h2>
                <button class="faq-question" type="button" aria-expanded="false" aria-controls="${answerId}">
                    ${escapeHtml(item.question)}
                </button>
            </h2>
            <p class="faq-answer" id="${answerId}">${escapeHtml(item.answer)}</p>
        </article>
    `;
    }).join('');

    container.querySelectorAll('.faq-question').forEach((button) => {
        button.addEventListener('click', () => {
            const item = button.closest('.faq-item');
            if (!item) return;

            const isOpen = item.classList.toggle('is-open');
            button.setAttribute('aria-expanded', String(isOpen));
        });
    });
}

initExtraPage({
    pageKey: 'faq',
    idPrefix: 'faq',
    onReady: (content) => renderFaq(content.items),
});
