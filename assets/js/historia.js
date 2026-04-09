import { revealElements } from './utils.js';
import { initGallery } from './gallery.js';
import { initExtraPage } from './extra-page.js';

function loadGallery(images) {
    const section = document.getElementById('historiaGallery');
    if (!section) return;

    if (!Array.isArray(images) || images.length === 0) return;

    section.hidden = false;
    initGallery('historiaGalleryInner', images);
    revealElements('#historiaGallery .reveal');
}

function renderTimeline(chapters) {
    const container = document.getElementById('historiaTimeline');
    if (!container || !Array.isArray(chapters)) return;

    container.innerHTML = chapters.map((chapter, index) => `
        <article class="historia-chapter ${index % 2 === 0 ? 'historia-chapter--left' : 'historia-chapter--right'}">
            <span class="historia-year">${chapter.year ?? ''}</span>
            <h2 class="historia-chapter-title">${chapter.title ?? ''}</h2>
            <p class="historia-chapter-text">${chapter.text ?? ''}</p>
        </article>
    `).join('');
}

initExtraPage({
    pageKey: 'historia',
    idPrefix: 'historia',
    onReady: (content) => renderTimeline(content.chapters),
    onReveal: (content) => loadGallery(content.gallery),
});
