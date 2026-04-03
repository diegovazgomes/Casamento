import { WeddingApp } from './main.js';
import { Countdown } from './countdown.js';
import { RSVP } from './rsvp.js';
import { PresentPage } from './presente.js';
import { AudioController } from './audio.js';

function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function applyConfig(config) {
    const root = document.documentElement;
    const spacing = config.spacing ?? {};
    const scale = spacing.scale ?? {};
    const semantic = spacing.semantic ?? {};
    const type = config.fontSizes?.semantic ?? {};
    const componentSizes = config.componentSizes ?? {};
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
        '--scroll-hint-text-size': type.scrollHint ?? '9px',
        '--section-tag-size': type.sectionTag ?? '9px',
        '--section-title-min': type.sectionTitle?.min ?? '34px',
        '--section-title-fluid': type.sectionTitle?.fluid ?? '7vw',
        '--section-title-max': type.sectionTitle?.max ?? '56px',
        '--section-body-size': type.sectionBody ?? '13px',
        '--countdown-number-size': type.countdownNumber ?? '42px',
        '--countdown-label-size': type.countdownLabel ?? '8px',
        '--detail-icon-size': type.detailIcon ?? '18px',
        '--detail-title-size': type.detailTitle ?? '8px',
        '--detail-value-size': type.detailValue ?? '20px',
        '--detail-sub-size': type.detailSub ?? '10px',
        '--rsvp-title-size': type.rsvpTitle ?? '38px',
        '--rsvp-subtitle-size': type.rsvpSubtitle ?? '11px',
        '--rsvp-input-size': type.rsvpInput ?? '12px',
        '--rsvp-choice-size': type.rsvpChoice ?? '10px',
        '--rsvp-submit-size': type.rsvpSubmit ?? '10px',
        '--rsvp-success-text-size': type.rsvpSuccessText ?? '26px',
        '--rsvp-success-sub-size': type.rsvpSuccessSub ?? '11px',
        '--footer-names-size': type.footerNames ?? '30px',
        '--footer-note-size': type.footerNote ?? '10px',
        '--countdown-finished-size': type.countdownFinished ?? '30px',
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
        '--footer-padding-bottom': semantic.footerPaddingBottom ?? spacing.footerBottom ?? '48px',
        '--divider-width': componentSizes.dividerWidth ?? '320px',
        '--divider-diamond-size': componentSizes.dividerDiamond ?? '6px',
        '--scroll-arrow-width': componentSizes.scrollArrowWidth ?? '14px',
        '--scroll-arrow-height': componentSizes.scrollArrowHeight ?? '48px',
        '--scroll-arrow-stem-height': componentSizes.scrollArrowStemHeight ?? '36px',
        '--scroll-arrow-head-size': componentSizes.scrollArrowHeadSize ?? '8px',
        '--countdown-card-padding-top': componentSizes.countdownCardPaddingTop ?? '22px',
        '--countdown-card-padding-inline': componentSizes.countdownCardPaddingInline ?? '8px',
        '--countdown-card-padding-bottom': componentSizes.countdownCardPaddingBottom ?? '16px',
        '--rsvp-input-padding-block': componentSizes.rsvpInputPaddingBlock ?? '14px',
        '--rsvp-input-padding-inline': componentSizes.rsvpInputPaddingInline ?? '18px',
        '--rsvp-choice-min-height': componentSizes.rsvpChoiceMinHeight ?? '48px',
        '--rsvp-choice-padding': componentSizes.rsvpChoicePadding ?? '12px',
        '--rsvp-submit-padding-block': componentSizes.rsvpSubmitPaddingBlock ?? '16px',
        '--rsvp-submit-padding-inline': componentSizes.rsvpSubmitPaddingInline ?? '32px',
        '--rsvp-success-icon-size': componentSizes.rsvpSuccessIcon ?? '32px'
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

class InvitationExperience {
    constructor(config) {
        this.config = config;
        this.weddingApp = null;
        this.countdown = null;
        this.rsvp = null;
        this.presentPage = new PresentPage();
        this.audio = new AudioController();
        this.hasStarted = false;
        this.mainInitialized = false;
        this.overlayHideTimeoutId = null;

        this.introScreen = document.getElementById('introScreen');
        this.openInviteButton = document.getElementById('openInviteButton');
        this.siteShell = document.getElementById('siteShell');
        this.giftOverlay = document.getElementById('giftOverlay');
        this.audioToggle = document.getElementById('audioToggle');
        this.audioToggleLabel = this.audioToggle?.querySelector('.audio-toggle__label') ?? null;
        this.giftOpenTriggers = Array.from(document.querySelectorAll('[data-open-gift-overlay]'));
        this.giftCloseTriggers = Array.from(document.querySelectorAll('[data-close-gift-overlay]'));
    }

    init() {
        applyConfig(this.config);
        this.presentPage.init();
        this.bindIntro();
        this.bindGiftOverlay();
        this.bindAudioToggle();
        this.bindKeyboardShortcuts();
        this.audio.addEventListener('statechange', () => this.syncAudioButton());
        this.syncAudioButton();

        if (!this.siteShell) {
            this.initializeMainSite();
            return;
        }

        if (!this.introScreen || !this.openInviteButton) {
            this.enterInvitation({ skipIntro: true });
        }
    }

    bindIntro() {
        if (!this.openInviteButton) {
            return;
        }

        this.openInviteButton.addEventListener('click', () => this.enterInvitation());
    }

    bindGiftOverlay() {
        this.giftOpenTriggers.forEach((trigger) => {
            trigger.addEventListener('click', () => this.openGiftOverlay());
        });

        this.giftCloseTriggers.forEach((trigger) => {
            trigger.addEventListener('click', () => {
                const scrollTarget = trigger.dataset.scrollTarget;
                this.closeGiftOverlay(scrollTarget);
            });
        });
    }

    bindAudioToggle() {
        if (!this.audioToggle) {
            return;
        }

        this.audioToggle.addEventListener('click', async () => {
            await this.audio.toggle();
            this.syncAudioButton();
        });
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.giftOverlay?.classList.contains('is-open')) {
                this.closeGiftOverlay();
            }
        });
    }

    initializeMainSite() {
        if (this.mainInitialized) {
            return;
        }

        this.weddingApp = new WeddingApp(this.config);
        this.countdown = new Countdown('2026-09-06T17:00:00-03:00', this.config);
        this.rsvp = new RSVP(this.config);

        this.weddingApp.init();
        this.countdown.start();
        this.rsvp.init();
        this.mainInitialized = true;

        window.addEventListener('beforeunload', () => this.countdown?.stop(), { once: true });
    }

    async enterInvitation({ skipIntro = false } = {}) {
        if (this.hasStarted) {
            return;
        }

        this.hasStarted = true;
        document.body.classList.add('experience-started');
        document.body.classList.remove('experience-locked');

        if (this.siteShell) {
            this.siteShell.hidden = false;
            this.siteShell.setAttribute('aria-hidden', 'false');

            window.requestAnimationFrame(() => {
                this.siteShell.classList.add('is-visible');
            });
        }

        if (this.introScreen && !skipIntro) {
            this.introScreen.classList.add('is-exiting');
            window.setTimeout(() => {
                this.introScreen.hidden = true;
            }, 700);
        } else if (this.introScreen) {
            this.introScreen.hidden = true;
        }

        this.initializeMainSite();
        await this.audio.unlock();
        await this.audio.setContext('main');
        this.syncAudioButton();

        if (window.location.hash === '#gift') {
            window.setTimeout(() => this.openGiftOverlay(), 420);
        }
    }

    openGiftOverlay() {
        if (!this.giftOverlay) {
            return;
        }

        if (!this.hasStarted) {
            this.enterInvitation().then(() => this.openGiftOverlay());
            return;
        }

        window.clearTimeout(this.overlayHideTimeoutId);
        this.giftOverlay.hidden = false;
        this.giftOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('gift-overlay-open');

        window.requestAnimationFrame(() => {
            this.giftOverlay.classList.add('is-open');
        });

        this.revealGiftOverlayContent();
        this.audio.setContext('gift');
        this.giftOverlay.querySelector('.gift-overlay-close')?.focus();
    }

    closeGiftOverlay(scrollTarget) {
        if (!this.giftOverlay) {
            return;
        }

        this.giftOverlay.classList.remove('is-open');
        this.giftOverlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('gift-overlay-open');
        this.audio.setContext('main');

        this.overlayHideTimeoutId = window.setTimeout(() => {
            this.giftOverlay.hidden = true;
        }, 380);

        if (scrollTarget) {
            const target = document.querySelector(scrollTarget);
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    revealGiftOverlayContent() {
        if (!this.giftOverlay) {
            return;
        }

        this.giftOverlay
            .querySelectorAll('.section-tag, .section-title, .section-body, .divider')
            .forEach((element) => element.classList.add('visible'));
    }

    syncAudioButton() {
        if (!this.audioToggle) {
            return;
        }

        const detail = {
            currentTrackKey: this.audio.currentTrackKey,
            desiredTrackKey: this.audio.desiredTrackKey,
            userPaused: this.audio.userPaused,
            readyForPlayback: this.audio.readyForPlayback,
            isPlaying: Boolean(this.audio.getCurrentElement() && !this.audio.getCurrentElement().paused),
            hasError: Boolean(this.audio.lastError)
        };

        this.audioToggle.hidden = !this.hasStarted;
        this.audioToggle.classList.toggle('is-paused', detail.userPaused || !detail.isPlaying);
        this.audioToggle.classList.toggle('is-disabled', detail.hasError && !detail.isPlaying);
        this.audioToggle.setAttribute('aria-pressed', String(!detail.userPaused && detail.isPlaying));

        if (detail.hasError && !detail.isPlaying) {
            this.audioToggle.setAttribute('aria-label', 'Som indisponível');
            if (this.audioToggleLabel) {
                this.audioToggleLabel.textContent = 'Som';
            }
            return;
        }

        const nextAction = detail.userPaused || !detail.isPlaying ? 'Retomar som' : 'Pausar som';
        this.audioToggle.setAttribute('aria-label', nextAction);

        if (this.audioToggleLabel) {
            this.audioToggleLabel.textContent = 'Som';
        }
    }
}

async function bootstrap() {
    try {
        const config = await loadConfig();
        const experience = new InvitationExperience(config);
        experience.init();
    } catch (error) {
        console.error('Falha ao carregar a configuracao da pagina.', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
    bootstrap();
}
