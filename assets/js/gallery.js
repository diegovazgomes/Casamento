/**
/**
 * gallery.js
 * Galeria de fotos navegável, integrada à página de história do casal.
 * Exporta initGallery(containerId, images) — recebe um array de { src, alt }.
 * Chamada por historia.js após carregar assets/images/gallery/index.json.
 *
 * Para habilitar: adicione fotos em assets/images/gallery/ e liste-as no index.json.
 * Para desabilitar: esvazie (ou remova) o index.json — a galeria simplesmente não aparece.
 */

/**
 * Inicializa a galeria dentro do elemento identificado por containerId.
 * @param {string} containerId - ID do elemento container no DOM.
 * @param {Array<{src: string, alt: string}>} images - Lista de imagens.
 */
export function initGallery(containerId, images) {
    const container = document.getElementById(containerId);
    if (!container || !Array.isArray(images) || images.length === 0) return;

    const total = images.length;
    let currentIndex = 0;

    // Constrói o HTML interno da galeria
    container.innerHTML =
        `<div class="gallery-track" role="region" aria-label="Galeria de fotos">` +
            images.map((img, i) =>
                `<figure class="gallery-slide${i === 0 ? ' active' : ''}" aria-hidden="${i !== 0}" data-index="${i}">` +
                `<img src="${img.src}" alt="${img.alt ?? ''}" loading="lazy">` +
                `</figure>`
            ).join('') +
        `</div>` +
        (total > 1
            ? `<div class="gallery-controls">` +
                `<button class="gallery-nav gallery-prev" aria-label="Foto anterior" type="button">&#8592;</button>` +
                `<div class="gallery-dots" role="tablist">` +
                    images.map((_, i) =>
                        `<button class="gallery-dot${i === 0 ? ' active' : ''}" role="tab" aria-selected="${i === 0}" aria-label="Foto ${i + 1}" data-index="${i}" type="button"></button>`
                    ).join('') +
                `</div>` +
                `<button class="gallery-nav gallery-next" aria-label="Próxima foto" type="button">&#8594;</button>` +
              `</div>`
            : '');

    const slides = container.querySelectorAll('.gallery-slide');
    const dots   = container.querySelectorAll('.gallery-dot');
    const prevBtn = container.querySelector('.gallery-prev');
    const nextBtn = container.querySelector('.gallery-next');

    function showSlide(index) {
        currentIndex = ((index % total) + total) % total;

        slides.forEach((s, i) => {
            s.classList.toggle('active', i === currentIndex);
            s.setAttribute('aria-hidden', String(i !== currentIndex));
        });
        dots.forEach((d, i) => {
            d.classList.toggle('active', i === currentIndex);
            d.setAttribute('aria-selected', String(i === currentIndex));
        });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => showSlide(i));
    });

    // Se a extensão estiver errada no index.json, tenta alternativas comuns automaticamente.
    container.querySelectorAll('.gallery-slide img').forEach((imgEl) => {
        imgEl.addEventListener('error', () => {
            if (imgEl.dataset.fallbackTried === 'true') return;

            const src = imgEl.getAttribute('src') || '';
            let fallbackSrc = '';
            if (/\.jpe?g$/i.test(src)) fallbackSrc = src.replace(/\.jpe?g$/i, '.png');
            else if (/\.png$/i.test(src)) fallbackSrc = src.replace(/\.png$/i, '.jpg');

            if (!fallbackSrc || fallbackSrc === src) return;

            imgEl.dataset.fallbackTried = 'true';
            imgEl.src = fallbackSrc;
        });
    });

    // Navegação por teclado scoped ao container
    container.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  showSlide(currentIndex - 1);
        if (e.key === 'ArrowRight') showSlide(currentIndex + 1);
    });
}
