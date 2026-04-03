import { WeddingApp } from './main.js';
import { Countdown } from './countdown.js';
import { RSVP } from './rsvp.js';

function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function applyConfig(config) {
    const root = document.documentElement;
    const spacing = config.spacing ?? {};
    const scale = spacing.scale ?? {};
    const semantic = spacing.semantic ?? {};
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
        '--space-xs': scale.xs ?? '8px',
        '--space-sm': scale.sm ?? '12px',
        '--space-md': scale.md ?? '16px',
        '--space-lg': scale.lg ?? '22px',
        '--space-xl': scale.xl ?? '30px',
        '--space-2xl': scale.xxl ?? '40px',
        '--space-3xl': scale.xxxl ?? '48px',
        '--space-4xl': scale.xxxxl ?? '56px',
        '--space-section': scale.section ?? semantic.sectionPaddingTop ?? spacing.sectionTop ?? '88px',
        '--section-padding-top': semantic.sectionPaddingTop ?? spacing.sectionTop ?? '88px',
        '--details-section-padding-top': semantic.detailsSectionPaddingTop ?? semantic.sectionPaddingTop ?? spacing.sectionTop ?? '88px',
        '--section-padding-inline': semantic.sectionPaddingInline ?? spacing.inline ?? '24px',
        '--section-tag-gap': semantic.sectionTagGap ?? '30px',
        '--section-title-gap': semantic.sectionTitleGap ?? '22px',
        '--hero-label-gap': semantic.heroLabelGap ?? '16px',
        '--hero-date-gap': semantic.heroDateGap ?? '22px',
        '--scroll-hint-bottom': semantic.scrollHintBottom ?? '20px',
        '--scroll-hint-gap': semantic.scrollHintGap ?? '8px',
        '--divider-margin-top': semantic.dividerMarginTop ?? '56px',
        '--countdown-margin-top': semantic.countdownMarginTop ?? '40px',
        '--content-max-width': config.layout.contentMaxWidth,
        '--countdown-gap': semantic.countdownGap ?? spacing.countdownGap ?? '12px',
        '--details-margin-top': semantic.detailsMarginTop ?? '40px',
        '--details-grid-gap': semantic.detailsGridGap ?? '1px',
        '--detail-card-padding-block': semantic.detailCardPaddingBlock ?? '28px',
        '--detail-card-padding-inline': semantic.detailCardPaddingInline ?? '20px',
        '--rsvp-shell-padding-bottom': semantic.rsvpShellPaddingBottom ?? '88px',
        '--rsvp-card-margin-top': semantic.rsvpCardMarginTop ?? '40px',
        '--rsvp-card-padding-block': semantic.rsvpCardPaddingBlock ?? '48px',
        '--rsvp-card-padding-inline': semantic.rsvpCardPaddingInline ?? '32px',
        '--rsvp-subtitle-gap': semantic.rsvpSubtitleGap ?? '32px',
        '--rsvp-form-gap': semantic.rsvpFormGap ?? '14px',
        '--rsvp-choice-gap': semantic.rsvpChoiceGap ?? '10px',
        '--rsvp-submit-margin-top': semantic.rsvpSubmitMarginTop ?? '8px',
        '--footer-padding-bottom': semantic.footerPaddingBottom ?? spacing.footerBottom ?? '48px'
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
