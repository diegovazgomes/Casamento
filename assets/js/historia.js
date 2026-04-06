function setText(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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

    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
});
