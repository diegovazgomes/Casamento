import { revealElements, setText } from './utils.js';
import { initGallery } from './gallery.js';

const GALLERY_INDEX_URL = 'assets/images/gallery/index.json';

async function loadGallery() {
    const section = document.getElementById('historiaGallery');
    if (!section) return;

    let images;
    try {
        const res = await fetch(GALLERY_INDEX_URL);
        if (!res.ok) return;
        images = await res.json();
    } catch {
        return;
    }

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

window.addEventListener('app:ready', ({ detail }) => {
    const content = detail.config?.pages?.historia?.content;
    if (!content) return;

    setText('historiaTag', content.tag);
    setText('historiaTitle', content.title);
    setText('historiaIntro', content.intro);
    renderTimeline(content.chapters);

    revealElements('.reveal');
    loadGallery();
});
