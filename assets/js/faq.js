import { revealElements, setText } from './utils.js';

function renderFaq(items) {
    const container = document.getElementById('faqList');
    if (!container || !Array.isArray(items)) return;

    container.innerHTML = items.map((item) => `
        <article class="faq-item">
            <h2 class="faq-question">${item.question ?? ''}</h2>
            <p class="faq-answer">${item.answer ?? ''}</p>
        </article>
    `).join('');
}

window.addEventListener('app:ready', ({ detail }) => {
    const content = detail.config?.pages?.faq?.content;
    if (!content) return;

    setText('faqTag', content.tag);
    setText('faqTitle', content.title);
    setText('faqIntro', content.intro);
    renderFaq(content.items);

    revealElements('.reveal');
});
