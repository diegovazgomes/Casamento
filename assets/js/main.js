export class WeddingApp {
    constructor(config = {}) {
        this.config = config;
    }

    init() {
        this.setupHeroContentReveal();
        this.setupHeroPhoto();
        this.setupScrollHint();
        this.setupRevealOnScroll();
        this.setupSiteNav();
    }

    setupHeroContentReveal() {
        const content = document.querySelector('.hero-content');

        if (!content) {
            return;
        }

        const reveal = () => {
            window.requestAnimationFrame(() => {
                window.setTimeout(() => {
                    content.classList.add('is-visible');
                }, Number(this.config.animation?.delay ?? 300));
            });
        };

        reveal();
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

    setupSiteNav() {
        const nav = document.getElementById('siteNav');

        if (!nav) {
            return;
        }

        // Popula o brand com os nomes já inseridos no DOM pelo script.js
        const navBrand = document.getElementById('navBrand');

        if (navBrand) {
            const name1 = document.getElementById('heroName1')?.textContent?.trim();
            const name2 = document.getElementById('heroName2')?.textContent?.trim();

            if (name1 && name2) {
                navBrand.textContent = `${name1} & ${name2}`;
            }
        }

        // Adiciona classe .is-scrolled ao rolar a página
        window.addEventListener('scroll', () => {
            nav.classList.toggle('is-scrolled', window.scrollY > 40);
        }, { passive: true });
    }
}
