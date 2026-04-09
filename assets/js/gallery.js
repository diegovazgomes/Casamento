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
    let lastSwipeAt = 0;

    const SWIPE_THRESHOLD_PX = 48;
    const SWIPE_COOLDOWN_MS = 220;

    // Constrói o HTML interno da galeria
    container.innerHTML =
        `<div class="gallery-track" role="region" aria-live="polite" aria-label="Galeria de fotos, imagem 1 de ${total}">` +
            images.map((img, i) =>
                `<figure class="gallery-slide${i === 0 ? ' active' : ''}" aria-hidden="${i !== 0}" data-index="${i}">` +
                `<img src="${img.src}" alt="${img.alt ?? ''}" loading="lazy">` +
                `</figure>`
            ).join('') +
        `</div>` +
        (total > 1
            ? `<div class="gallery-controls">` +
                                `<button class="gallery-nav gallery-prev" aria-label="Ver foto anterior" type="button">&#8592;</button>` +
                `<div class="gallery-dots" role="tablist">` +
                    images.map((_, i) =>
                                                `<button class="gallery-dot${i === 0 ? ' active' : ''}" role="tab" aria-selected="${i === 0}" aria-label="Ir para foto ${i + 1}" data-index="${i}" type="button"></button>`
                    ).join('') +
                `</div>` +
                                `<button class="gallery-nav gallery-next" aria-label="Ver próxima foto" type="button">&#8594;</button>` +
              `</div>`
            : '');

    const track = container.querySelector('.gallery-track');
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

        if (track) {
            track.setAttribute('aria-label', `Galeria de fotos, imagem ${currentIndex + 1} de ${total}`);
        }

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

    if (track && total > 1) {
        const swipeState = {
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            isTracking: false
        };

        const resetSwipeState = () => {
            swipeState.startX = 0;
            swipeState.startY = 0;
            swipeState.endX = 0;
            swipeState.endY = 0;
            swipeState.isTracking = false;
        };

        track.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1) {
                resetSwipeState();
                return;
            }

            const touch = event.touches[0];
            swipeState.startX = touch.clientX;
            swipeState.startY = touch.clientY;
            swipeState.endX = touch.clientX;
            swipeState.endY = touch.clientY;
            swipeState.isTracking = true;
        }, { passive: true });

        track.addEventListener('touchmove', (event) => {
            if (!swipeState.isTracking || event.touches.length !== 1) return;

            const touch = event.touches[0];
            swipeState.endX = touch.clientX;
            swipeState.endY = touch.clientY;
        }, { passive: true });

        track.addEventListener('touchcancel', resetSwipeState, { passive: true });

        track.addEventListener('touchend', () => {
            if (!swipeState.isTracking) return;

            const deltaX = swipeState.endX - swipeState.startX;
            const deltaY = swipeState.endY - swipeState.startY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            const isHorizontalSwipe = absDeltaX >= SWIPE_THRESHOLD_PX && absDeltaX > absDeltaY;
            const now = Date.now();
            const isOnCooldown = now - lastSwipeAt < SWIPE_COOLDOWN_MS;

            if (isHorizontalSwipe && !isOnCooldown) {
                if (deltaX < 0) showSlide(currentIndex + 1);
                else showSlide(currentIndex - 1);
                lastSwipeAt = now;
            }

            resetSwipeState();
        }, { passive: true });
    }

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
