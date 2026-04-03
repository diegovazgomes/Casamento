class WeddingApp {
    init() {
        this.setupHeroPhoto();
        this.setupScrollHint();
        this.setupRevealOnScroll();
    }

    setupHeroPhoto() {
        const image = document.getElementById('couplePhoto');

        if (!image) {
            return;
        }

        const markAsLoaded = () => image.classList.add('loaded');
        image.addEventListener('load', markAsLoaded, { once: true });

        if (image.complete) {
            markAsLoaded();
        }
    }

    setupScrollHint() {
        const trigger = document.querySelector('[data-scroll-target]');

        if (!trigger) {
            return;
        }

        trigger.addEventListener('click', () => {
            const target = document.querySelector(trigger.dataset.scrollTarget);
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    setupRevealOnScroll() {
        const revealTargets = document.querySelectorAll(
            '.section-tag, .section-title, .section-body, .divider, .countdown-wrap, .details-grid, .rsvp-section'
        );

        if (!revealTargets.length) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        revealTargets.forEach((element) => observer.observe(element));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new WeddingApp();
    app.init();
});
