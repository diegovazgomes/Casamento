import { WeddingApp } from './main.js';
import { Countdown } from './countdown.js';
import { RSVP } from './rsvp.js';

function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function applyConfig(config) {
    const root = document.documentElement;
    const cssVars = {
        '--gold': config.colors.primary,
        '--gold-light': config.colors.secondary,
        '--dark': config.colors.background,
        '--base-font-size': config.fontSizes.base,
        '--hero-height': config.layout.heroHeight,
        '--hero-padding': config.layout.heroPadding,
        '--hero-content-width': config.layout.heroContentWidth,
        '--hero-content-padding-bottom': config.layout.heroContentPaddingBottom,
        '--hero-fade-duration': config.animation.fade,
        '--hero-fade-offset': config.layout.heroFadeOffset,
        '--hero-label-size': config.fontSizes.heroLabel,
        '--hero-date-size': config.fontSizes.heroDate,
        '--hero-name-min': config.fontSizes.heroNames.min,
        '--hero-name-fluid': config.fontSizes.heroNames.fluid,
        '--hero-name-max': config.fontSizes.heroNames.max,
        '--section-padding-top': config.spacing.sectionTop,
        '--section-padding-inline': config.spacing.inline,
        '--content-max-width': config.layout.contentMaxWidth,
        '--countdown-gap': config.spacing.countdownGap,
        '--footer-padding-bottom': config.spacing.footerBottom
    };

    Object.entries(cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
}

async function loadConfig() {
    const configPath = isMobileViewport() ? '../config/mobile.js' : '../config/desktop.js';
    const module = await import(configPath);
    return module.CONFIG;
}

function initializeApp(config) {
    applyConfig(config);

    const weddingApp = new WeddingApp(config);
    const countdown = new Countdown('2026-09-06T17:00:00-03:00', config);
    const rsvp = new RSVP(config);

    weddingApp.init();
    countdown.start();
    rsvp.init();

    window.addEventListener('beforeunload', () => countdown.stop(), { once: true });
}

async function bootstrap() {
    try {
        const config = await loadConfig();
        initializeApp(config);
    } catch (error) {
        console.error('Falha ao carregar a configuracao da pagina.', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
    bootstrap();
}
