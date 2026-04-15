import { WeddingApp } from './main.js';
import { Countdown } from './countdown.js';
import { RSVP } from './rsvp.js';
import { PresentPage } from './presente.js';
import { AudioController } from './audio.js';
import { cloneDeep, mergeDeep, setInputPlaceholder, setText } from './utils.js';

const SITE_CONFIG_URL = 'assets/config/site.json';
const TYPOGRAPHY_CONFIG_URL = 'assets/config/typography.json';
const INVITATION_STARTED_STORAGE_KEY = 'wedding-invitation-started';
const NAVIGATION_SECTION_PARAM = 'section';
const GUEST_TOKEN_API_URL = '/api/guest-token';

// Para trocar o tema, altere apenas esta constante.
// Temas disponíveis: classic-gold.json, classic-silver.json
const ACTIVE_THEME_PATH = 'assets/config/themes/classic-silver-light.json';

// Layout padrão quando site.json não define activeLayout
const ACTIVE_LAYOUT_KEY = 'classic';

const DEFAULT_THEME_URL         = 'assets/config/defaults/theme.json';
const DEFAULT_SITE_CONTENT_URL  = 'assets/config/defaults/site.json';

// Minimal safety-net fallbacks — populated from the external files above at bootstrap.
// These only activate if both the server AND the defaults files are unreachable.
let DEFAULT_THEME = {
    colors: {},
    typography: { fonts: {}, sizes: { heroNames: {}, sectionTitle: {} } },
    spacing: {}, layout: {}, components: {}, radius: {}, effects: {},
    animation: {}, countdown: { format: 'two-digits', updateInterval: 1000 }, responsive: {}
};
let DEFAULT_SITE_CONTENT = {
    couple: {}, event: {}, texts: {}, gift: {},
    media: { tracks: { main: {}, gift: {} } },
    whatsapp: { messages: {}, feedback: {} }, pages: {},
    rsvp: { eventId: 'wedding-event', supabaseEnabled: false }
};

// ──────────────────────────────────────────────────────────────────────────────
// The large DEFAULT_THEME and DEFAULT_SITE_CONTENT objects have been moved to:
//   assets/config/defaults/theme.json
//   assets/config/defaults/site.json
// They are loaded in bootstrap() before anything else via loadDefaults().
// ──────────────────────────────────────────────────────────────────────────────


function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function getBootstrapNavigationState() {
    const bootstrapState = window.__INVITATION_BOOTSTRAP__ ?? {};

    return {
        shouldSkipIntro: Boolean(bootstrapState.shouldSkipIntro),
        navigationTarget: bootstrapState.navigationTarget || null,
        guestToken: bootstrapState.guestToken || null
    };
}

async function loadGuestTokenData(token) {
    try {
        const res = await fetch(`${GUEST_TOKEN_API_URL}?token=${encodeURIComponent(token)}`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Resolve o tema final aplicando overrides de mobile quando necessário.
function resolveTheme(theme) {
    if (!isMobileViewport() || !theme.responsive?.mobile) {
        return theme;
    }

    return mergeDeep(theme, theme.responsive.mobile);
}

// Resolve typography roles to individual CSS variables
// Each role is expanded into family, size, weight, lineHeight, letterSpacing, textTransform, style
function resolveTypographyRoles(theme) {
    const families = theme.typography?.families ?? {};
    const roles = theme.typography?.roles ?? {};
    const vars = {};

    Object.entries(roles).forEach(([roleName, roleDef]) => {
        const familyKey = roleDef.family ?? 'body';
        const familyValue = families[familyKey] ?? families.body ?? "'Jost', sans-serif";
        
        // Resolve size (handle clamp() objects)
        let sizeValue = roleDef.size ?? '13px';
        if (typeof sizeValue === 'object') {
            sizeValue = `clamp(${sizeValue.min}, ${sizeValue.fluid}, ${sizeValue.max})`;
        }

        // Generate individual property variables for each role
        vars[`--typo-${roleName}-family`] = familyValue;
        vars[`--typo-${roleName}-size`] = sizeValue;
        vars[`--typo-${roleName}-weight`] = roleDef.weight ?? 300;
        vars[`--typo-${roleName}-lineHeight`] = roleDef.lineHeight ?? 1;
        vars[`--typo-${roleName}-letterSpacing`] = roleDef.letterSpacing ?? 'normal';
        vars[`--typo-${roleName}-textTransform`] = roleDef.textTransform ?? 'none';
        vars[`--typo-${roleName}-style`] = roleDef.style ?? 'normal';
    });

    return vars;
}

// Aplica todas as CSS variables do tema no :root.
// Recebe o tema já resolvido (após resolveTheme).
function applyTheme(theme) {
    const root = document.documentElement;
    const colors = theme.colors ?? {};
    const fonts = theme.typography?.fonts ?? {};
    const sizes = theme.typography?.sizes ?? {};
    const spacing = theme.spacing ?? {};
    const layout = theme.layout ?? {};
    const components = theme.components ?? {};
    const radius = theme.radius ?? {};
    const effects = theme.effects ?? {};
    const animation = theme.animation ?? {};
    const dt = DEFAULT_THEME;

    const cssVars = {
        // Cores
        '--color-bg': colors.background ?? dt.colors.background,
        '--color-surface': colors.surface ?? dt.colors.surface,
        '--color-surface-soft': colors.surfaceSoft ?? dt.colors.surfaceSoft,
        '--color-primary': colors.primary ?? dt.colors.primary,
        '--color-primary-soft': colors.primarySoft ?? dt.colors.primarySoft,
        '--color-primary-glow': colors.primaryGlow ?? dt.colors.primaryGlow,
        '--color-text': colors.text ?? dt.colors.text,
        '--color-text-muted': colors.textMuted ?? dt.colors.textMuted,
        '--color-text-soft': colors.textSoft ?? dt.colors.textSoft,
        '--color-text-dim': colors.textDim ?? dt.colors.textDim,
        '--color-text-faint': colors.textFaint ?? dt.colors.textFaint,
        '--color-text-placeholder': colors.textPlaceholder ?? dt.colors.textPlaceholder,
        '--color-border': colors.border ?? dt.colors.border,
        '--color-border-soft': colors.borderSoft ?? dt.colors.borderSoft,
        '--color-border-strong': colors.borderStrong ?? dt.colors.borderStrong,
        '--color-gold-surface-soft': colors.goldSurfaceSoft ?? dt.colors.goldSurfaceSoft,
        '--color-gold-surface': colors.goldSurface ?? dt.colors.goldSurface,
        '--color-gold-surface-strong': colors.goldSurfaceStrong ?? dt.colors.goldSurfaceStrong,
        '--color-page-grid-line': colors.pageGridLine ?? dt.colors.pageGridLine,
        '--color-overlay-backdrop': colors.overlayBackdrop ?? dt.colors.overlayBackdrop,
        '--color-audio-bg': colors.audioPanelBg ?? colors.audioButtonBg ?? dt.colors.audioPanelBg,
        '--color-audio-hover-bg': colors.audioPanelHoverBg ?? dt.colors.audioPanelHoverBg,
        '--color-audio-border': colors.audioPanelBorder ?? colors.audioButtonBorder ?? dt.colors.audioPanelBorder,
        '--color-pulse-ring': colors.pulseRing ?? dt.colors.pulseRing,
        '--color-pulse-ring-spread': colors.pulseRingSpread ?? dt.colors.pulseRingSpread,
        '--color-input-focus-bg': colors.inputFocusBg ?? colors.inputBorderFocus ?? dt.colors.inputFocusBg,
        // Aliases legados usados no CSS existente
        '--cream': colors.text ?? dt.colors.text,
        '--gold': colors.primary ?? dt.colors.primary,
        '--gold-light': colors.primarySoft ?? dt.colors.primarySoft,
        '--dark': colors.background ?? dt.colors.background,
        '--border-soft': colors.border ?? dt.colors.border,
        '--surface-soft': colors.surfaceSoft ?? dt.colors.surfaceSoft,

        // Tipografia — famílias
        '--font-primary': fonts.primary ?? dt.typography.fonts.primary,
        '--font-serif': fonts.serif ?? dt.typography.fonts.serif,
        '--font-accent': fonts.accent ?? dt.typography.fonts.accent,

        // Tipografia — tamanhos
        '--base-font-size': sizes.base ?? dt.typography.sizes.base,
        '--hero-label-size': sizes.heroLabel ?? dt.typography.sizes.heroLabel,
        '--hero-date-size': sizes.heroDate ?? dt.typography.sizes.heroDate,
        '--hero-name-min': sizes.heroNames?.min ?? dt.typography.sizes.heroNames.min,
        '--hero-name-fluid': sizes.heroNames?.fluid ?? dt.typography.sizes.heroNames.fluid,
        '--hero-name-max': sizes.heroNames?.max ?? dt.typography.sizes.heroNames.max,
        '--scroll-hint-text-size': sizes.scrollHint ?? dt.typography.sizes.scrollHint,
        '--section-tag-size': sizes.sectionTag ?? dt.typography.sizes.sectionTag,
        '--section-title-min': sizes.sectionTitle?.min ?? dt.typography.sizes.sectionTitle.min,
        '--section-title-fluid': sizes.sectionTitle?.fluid ?? dt.typography.sizes.sectionTitle.fluid,
        '--section-title-max': sizes.sectionTitle?.max ?? dt.typography.sizes.sectionTitle.max,
        '--section-body-size': sizes.sectionBody ?? dt.typography.sizes.sectionBody,
        '--countdown-number-size': sizes.countdownNumber ?? dt.typography.sizes.countdownNumber,
        '--countdown-label-size': sizes.countdownLabel ?? dt.typography.sizes.countdownLabel,
        '--countdown-finished-size': sizes.countdownFinished ?? dt.typography.sizes.countdownFinished,
        '--detail-icon-size': sizes.detailIcon ?? dt.typography.sizes.detailIcon,
        '--detail-title-size': sizes.detailTitle ?? dt.typography.sizes.detailTitle,
        '--detail-value-size': sizes.detailValue ?? dt.typography.sizes.detailValue,
        '--detail-sub-size': sizes.detailSub ?? dt.typography.sizes.detailSub,
        '--rsvp-title-size': sizes.rsvpTitle ?? dt.typography.sizes.rsvpTitle,
        '--rsvp-subtitle-size': sizes.rsvpSubtitle ?? dt.typography.sizes.rsvpSubtitle,
        '--rsvp-input-size': sizes.rsvpInput ?? dt.typography.sizes.rsvpInput,
        '--rsvp-choice-size': sizes.rsvpChoice ?? dt.typography.sizes.rsvpChoice,
        '--rsvp-submit-size': sizes.rsvpSubmit ?? dt.typography.sizes.rsvpSubmit,
        '--rsvp-success-text-size': sizes.rsvpSuccessText ?? dt.typography.sizes.rsvpSuccessText,
        '--rsvp-success-sub-size': sizes.rsvpSuccessSub ?? dt.typography.sizes.rsvpSuccessSub,
        '--footer-names-size': sizes.footerNames ?? dt.typography.sizes.footerNames,
        '--footer-note-size': sizes.footerNote ?? dt.typography.sizes.footerNote,

        // Espaçamentos
        '--container-width': spacing.containerWidth ?? dt.spacing.containerWidth,
        '--card-padding': spacing.cardPadding ?? dt.spacing.cardPadding,
        '--spacing-section': spacing.sectionPaddingTop ?? dt.spacing.sectionPaddingTop,
        '--section-padding-top': spacing.sectionPaddingTop ?? dt.spacing.sectionPaddingTop,
        '--details-section-padding-top': spacing.detailsSectionPaddingTop ?? dt.spacing.detailsSectionPaddingTop,
        '--section-padding-inline': spacing.sectionPaddingInline ?? dt.spacing.sectionPaddingInline,
        '--section-tag-gap': spacing.sectionTagGap ?? dt.spacing.sectionTagGap,
        '--section-title-gap': spacing.sectionTitleGap ?? dt.spacing.sectionTitleGap,
        '--hero-label-gap': spacing.heroLabelGap ?? dt.spacing.heroLabelGap,
        '--hero-date-gap': spacing.heroDateGap ?? dt.spacing.heroDateGap,
        '--scroll-hint-bottom': spacing.scrollHintBottom ?? dt.spacing.scrollHintBottom,
        '--scroll-hint-gap': spacing.scrollHintGap ?? dt.spacing.scrollHintGap,
        '--divider-margin-top': spacing.dividerMarginTop ?? dt.spacing.dividerMarginTop,
        '--countdown-margin-top': spacing.countdownMarginTop ?? dt.spacing.countdownMarginTop,
        '--countdown-gap': spacing.countdownGap ?? dt.spacing.countdownGap,
        '--details-margin-top': spacing.detailsMarginTop ?? dt.spacing.detailsMarginTop,
        '--details-grid-gap': spacing.detailsGridGap ?? dt.spacing.detailsGridGap,
        '--detail-card-padding-block': spacing.detailCardPaddingBlock ?? dt.spacing.detailCardPaddingBlock,
        '--detail-card-padding-inline': spacing.detailCardPaddingInline ?? dt.spacing.detailCardPaddingInline,
        '--rsvp-shell-padding-bottom': spacing.rsvpShellPaddingBottom ?? dt.spacing.rsvpShellPaddingBottom,
        '--rsvp-card-margin-top': spacing.rsvpCardMarginTop ?? dt.spacing.rsvpCardMarginTop,
        '--rsvp-card-padding-block': spacing.rsvpCardPaddingBlock ?? dt.spacing.rsvpCardPaddingBlock,
        '--rsvp-card-padding-inline': spacing.rsvpCardPaddingInline ?? dt.spacing.rsvpCardPaddingInline,
        '--rsvp-subtitle-gap': spacing.rsvpSubtitleGap ?? dt.spacing.rsvpSubtitleGap,
        '--rsvp-form-gap': spacing.rsvpFormGap ?? dt.spacing.rsvpFormGap,
        '--rsvp-choice-gap': spacing.rsvpChoiceGap ?? dt.spacing.rsvpChoiceGap,
        '--rsvp-submit-margin-top': spacing.rsvpSubmitMarginTop ?? dt.spacing.rsvpSubmitMarginTop,
        '--footer-padding-bottom': spacing.footerPaddingBottom ?? dt.spacing.footerPaddingBottom,

        // Layout
        '--hero-height': layout.heroHeight ?? dt.layout.heroHeight,
        '--hero-padding': layout.heroPadding ?? dt.layout.heroPadding,
        '--hero-content-width': layout.heroContentWidth ?? dt.layout.heroContentWidth,
        '--hero-content-padding-bottom': layout.heroContentPaddingBottom ?? dt.layout.heroContentPaddingBottom,
        '--hero-fade-offset': layout.heroFadeOffset ?? dt.layout.heroFadeOffset,
        '--content-max-width': layout.contentMaxWidth ?? dt.layout.contentMaxWidth,

        // Componentes
        '--divider-width': components.dividerWidth ?? dt.components.dividerWidth,
        '--divider-diamond-size': components.dividerDiamond ?? dt.components.dividerDiamond,
        '--scroll-arrow-width': components.scrollArrowWidth ?? dt.components.scrollArrowWidth,
        '--scroll-arrow-height': components.scrollArrowHeight ?? dt.components.scrollArrowHeight,
        '--scroll-arrow-stem-height': components.scrollArrowStemHeight ?? dt.components.scrollArrowStemHeight,
        '--scroll-arrow-head-size': components.scrollArrowHeadSize ?? dt.components.scrollArrowHeadSize,
        '--countdown-card-padding-top': components.countdownCardPaddingTop ?? dt.components.countdownCardPaddingTop,
        '--countdown-card-padding-inline': components.countdownCardPaddingInline ?? dt.components.countdownCardPaddingInline,
        '--countdown-card-padding-bottom': components.countdownCardPaddingBottom ?? dt.components.countdownCardPaddingBottom,
        '--rsvp-input-padding-block': components.rsvpInputPaddingBlock ?? dt.components.rsvpInputPaddingBlock,
        '--rsvp-input-padding-inline': components.rsvpInputPaddingInline ?? dt.components.rsvpInputPaddingInline,
        '--rsvp-choice-min-height': components.rsvpChoiceMinHeight ?? dt.components.rsvpChoiceMinHeight,
        '--rsvp-choice-padding': components.rsvpChoicePadding ?? dt.components.rsvpChoicePadding,
        '--rsvp-submit-padding-block': components.rsvpSubmitPaddingBlock ?? dt.components.rsvpSubmitPaddingBlock,
        '--rsvp-submit-padding-inline': components.rsvpSubmitPaddingInline ?? dt.components.rsvpSubmitPaddingInline,
        '--rsvp-success-icon-size': components.rsvpSuccessIcon ?? dt.components.rsvpSuccessIcon,
        '--components-card-line-height': components.cardLineHeight ?? dt.components.cardLineHeight,
        '--components-card-line-height-extras': components.cardLineHeightExtras ?? dt.components.cardLineHeightExtras,
        '--components-card-line-z-index': components.cardLineZIndex ?? dt.components.cardLineZIndex,

        // Bordas
        '--radius-card': radius.card ?? dt.radius.card,
        '--radius-button': radius.button ?? dt.radius.button,

        // Efeitos
        '--shadow-soft': effects.shadowSoft ?? dt.effects.shadowSoft,
        '--shadow-hover': effects.shadowHover ?? dt.effects.shadowHover,
        '--shadow-text-strong': effects.textShadowStrong ?? dt.effects.textShadowStrong,
        '--shadow-text-soft': effects.textShadowSoft ?? dt.effects.textShadowSoft,
        '--focus-ring': effects.focusRing ?? dt.effects.focusRing,
        '--transition-standard': effects.transition ?? dt.effects.transition,
        '--page-gradient': effects.pageGradient ?? dt.effects.pageGradient,
        '--intro-backdrop-gradient': effects.introBackdropGradient ?? dt.effects.introBackdropGradient,
        '--intro-card-gradient': effects.introCardGradient ?? dt.effects.introCardGradient,
        '--button-fill-gradient': effects.buttonFillGradient ?? dt.effects.buttonFillGradient,
        '--hero-overlay-gradient': effects.heroOverlayGradient ?? dt.effects.heroOverlayGradient,
        '--overlay-panel-gradient': effects.overlayPanelGradient ?? dt.effects.overlayPanelGradient,
        '--overlay-close-gradient': effects.overlayCloseGradient ?? dt.effects.overlayCloseGradient,
        '--rsvp-panel-gradient': effects.rsvpPanelGradient ?? dt.effects.rsvpPanelGradient,
        '--gift-panel-gradient': effects.giftPanelGradient ?? dt.effects.giftPanelGradient,

        // Animações
        '--fade-duration': animation.fadeDuration ?? dt.animation.fadeDuration,
        '--stagger-delay': animation.staggerDelay ?? dt.animation.staggerDelay,
        '--hero-fade-duration': animation.heroFadeDuration ?? dt.animation.heroFadeDuration,
        '--animation-card-line-transition': animation.cardLineTransition ?? dt.animation.cardLineTransition
    };

    // Resolve and merge typography roles
    const typoVars = resolveTypographyRoles(theme);
    Object.assign(cssVars, typoVars);

    Object.entries(cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, String(value));
    });
}

function warnConfigIssues(config) {
    const critical = [
        ['couple.names', config?.couple?.names],
        ['event.date', config?.event?.date],
        ['event.mapsLink', config?.event?.mapsLink],
        ['whatsapp.destinationPhone', config?.whatsapp?.destinationPhone],
    ];
    critical.forEach(([path, val]) => {
        if (!val) console.warn(`[site.json] Campo crítico ausente ou vazio: ${path}`);
    });
}

function warnThemeIssues(theme) {
    const critical = [
        ['meta.name', theme?.meta?.name],
        ['colors.background', theme?.colors?.background],
        ['colors.primary', theme?.colors?.primary],
        ['typography.fonts.primary', theme?.typography?.fonts?.primary],
    ];
    critical.forEach(([path, val]) => {
        if (!val) console.warn(`[theme] Campo crítico ausente ou vazio: ${path}`);
    });
}

async function loadDefaults() {
    const fetchJson = async (url) => {
        const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    };

    await Promise.all([
        fetchJson(DEFAULT_THEME_URL)
            .then((d) => { DEFAULT_THEME = d; })
            .catch((e) => console.warn('[defaults] Falha ao carregar defaults/theme.json. Usando fallback mínimo.', e)),
        fetchJson(DEFAULT_SITE_CONTENT_URL)
            .then((d) => { DEFAULT_SITE_CONTENT = d; })
            .catch((e) => console.warn('[defaults] Falha ao carregar defaults/site.json. Usando fallback mínimo.', e)),
    ]);
}

export async function loadConfig(configUrl = SITE_CONFIG_URL, defaults = DEFAULT_SITE_CONTENT) {
    try {
        const response = await fetch(configUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`site.json returned HTTP ${response.status}`);
        }

        const siteConfig = await response.json();
        const merged = mergeDeep(defaults, siteConfig);
        warnConfigIssues(merged);
        return merged;
    } catch (error) {
        console.warn('Falha ao carregar assets/config/site.json. Usando fallback local.', error);
        return cloneDeep(defaults);
    }
}

export async function loadTheme(themePath, defaults = DEFAULT_THEME) {
    const baseTheme = cloneDeep(defaults);

    try {
        const response = await fetch(themePath, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Theme file returned HTTP ${response.status}`);
        }

        const themeConfig = await response.json();
        const merged = mergeDeep(baseTheme, themeConfig);
        warnThemeIssues(merged);
        return merged;
    } catch (error) {
        console.warn(`Falha ao carregar ${themePath}. Usando fallback local.`, error);
        return baseTheme;
    }
}

async function loadTypographyConfig() {
    try {
        const response = await fetch(TYPOGRAPHY_CONFIG_URL, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`typography.json returned HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.warn('Falha ao carregar assets/config/typography.json. Usando familias do tema.', error);
        return { typography: { families: {} } };
    }
}

function mergeThemeWithGlobalTypography(theme, typographyConfig) {
    const mergedTheme = cloneDeep(theme);
    const globalFamilies = typographyConfig?.typography?.families ?? {};
    const themeFamilies = mergedTheme.typography?.families ?? {};

    mergedTheme.typography = mergedTheme.typography ?? {};

    // Theme takes precedence to preserve current visual output.
    mergedTheme.typography.families = {
        ...globalFamilies,
        ...themeFamilies
    };

    return mergedTheme;
}

export function getThemeOverrideKey(themePath) {
    if (!themePath) return '';
    const normalized = String(themePath).replace(/\\/g, '/');
    const fileName = normalized.split('/').pop() || '';
    return fileName.replace(/\.json$/i, '');
}

function getThemeOverridesForActiveTheme(siteConfig, activeThemePath) {
    const byTheme = siteConfig?.themeOverridesByTheme;
    const themeKey = getThemeOverrideKey(activeThemePath);
    const scoped = themeKey ? byTheme?.[themeKey] : null;

    if (scoped && typeof scoped === 'object') {
        return scoped;
    }

    const legacy = siteConfig?.themeOverrides;
    if (legacy && typeof legacy === 'object') {
        return legacy;
    }

    return null;
}

export function applySiteThemeOverrides(theme, siteConfig, activeThemePath = null) {
    const overrides = getThemeOverridesForActiveTheme(siteConfig, activeThemePath);
    if (!overrides) {
        return theme;
    }

    return mergeDeep(theme, overrides);
}

class InvitationExperience {
    constructor(config, theme, navigationState = {}) {
        this.config = config;
        this.theme = theme;
        this.navigationState = navigationState;
        this.guestToken = navigationState.guestToken || null;
        this.guestTokenData = null;
        this.weddingApp = null;
        this.countdown = null;
        this.rsvp = null;
        this.presentPage = new PresentPage();
        this.audio = new AudioController(this.getAudioTracks());
        this.hasStarted = false;
        this.mainInitialized = false;

        this.introScreen = document.getElementById('introScreen');
        this.openInviteButton = document.getElementById('openInviteButton');
        this.siteShell = document.getElementById('siteShell');
        this.audioToggle = document.getElementById('audioToggle');
        this.audioToggleLabel = this.audioToggle?.querySelector('.audio-toggle__label') ?? null;
    }

    async init() {
        if (this.guestToken) {
            this.guestTokenData = await loadGuestTokenData(this.guestToken);
        }

        this.setMeta();
        this.setHero();
        this.setEventDetails();
        this.setTexts();
        this.setGift();
        this.setPages();
        this.presentPage.init();
        this.bindIntro();
        this.bindAudioToggle();
        this.audio.addEventListener('statechange', () => this.syncAudioButton());
        this.syncAudioButton();

        if (!this.siteShell) {
            this.enterInvitation({ skipIntro: true, shouldNavigate: false });
            return;
        }

        if (!this.introScreen || !this.openInviteButton || this.navigationState.shouldSkipIntro || this.wasInvitationStarted()) {
            this.enterInvitation({
                skipIntro: true,
                targetSection: this.navigationState.navigationTarget,
                forceTop: !this.navigationState.navigationTarget
            });
        }
    }

    bindIntro() {
        if (!this.openInviteButton) {
            return;
        }

        this.openInviteButton.addEventListener('click', () => {
            const initialContext = this.getInitialAudioContext();
            const audioPromise = this.audio.startFromGesture(initialContext);
            this.enterInvitation({ audioPromise });
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

    initializeMainSite() {
        if (this.mainInitialized) {
            return;
        }

        const eventDate = this.config.event?.date || DEFAULT_SITE_CONTENT.event.date;
        const themeAnimation = this.theme?.animation ?? DEFAULT_THEME.animation;
        const themeCountdown = this.theme?.countdown ?? DEFAULT_THEME.countdown;

        this.weddingApp = new WeddingApp({ animation: { delay: themeAnimation.heroRevealDelayMs ?? 300 } });
        this.countdown = new Countdown(eventDate, { countdown: themeCountdown });
        this.rsvp = new RSVP({
            whatsapp: this.config.whatsapp
        }, this.guestTokenData);

        this.weddingApp.init();
        this.countdown.start();
        this.rsvp.init();
        this.mainInitialized = true;

        window.addEventListener('beforeunload', () => this.countdown?.stop(), { once: true });

        // Detecta restauração via bfcache (botão voltar do browser após redirect)
        // e bloqueia o formulário se o convidado já confirmou nesta sessão.
        window.addEventListener('pageshow', (event) => {
            if (event.persisted && this.rsvp?.wasAlreadySubmittedThisSession()) {
                this.rsvp.showSlotCounter();
                this.rsvp.blockForm();
            }
        });
    }

    getInitialAudioContext() {
        const isGiftOrExtraPage = document.body.classList.contains('gift-page') || document.body.classList.contains('extra-page');
        return isGiftOrExtraPage ? 'gift' : 'main';
    }

    async enterInvitation({ skipIntro = false, targetSection = null, forceTop = false, audioPromise = null, shouldNavigate = true } = {}) {
        if (this.hasStarted) {
            this.applyStartedState({ skipIntro: true });
            if (shouldNavigate) {
                this.navigateWithinInvitation({ targetSection, forceTop });
            }
            return;
        }

        this.hasStarted = true;
        this.markInvitationStarted();
        this.applyStartedState({ skipIntro });

        this.initializeMainSite();
        if (audioPromise) {
            await audioPromise;
        } else {
            await this.audio.unlock();
            await this.audio.setContext(this.getInitialAudioContext());
        }

        this.syncAudioButton();

        if (shouldNavigate) {
            this.navigateWithinInvitation({ targetSection, forceTop });
        }
    }

    navigateWithinInvitation({ targetSection = null, forceTop = false } = {}) {
        const hash = window.location.hash;

        if (targetSection) {
            this.scrollToSection(targetSection);
            return;
        }

        if (forceTop || !hash) {
            window.requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0 });
            });
            return;
        }

        if (hash) {
            window.setTimeout(() => {
                document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 420);
        }
    }

    scrollToSection(sectionId) {
        window.setTimeout(() => {
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this.clearNavigationTarget();
        }, 420);
    }

    clearNavigationTarget() {
        const url = new URL(window.location.href);

        if (!url.searchParams.has(NAVIGATION_SECTION_PARAM)) {
            return;
        }

        url.searchParams.delete(NAVIGATION_SECTION_PARAM);
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        this.navigationState.navigationTarget = null;
    }

    applyStartedState({ skipIntro = false } = {}) {
        document.body.classList.add('experience-started');
        document.body.classList.remove('experience-locked');

        if (this.siteShell) {
            this.siteShell.hidden = false;
            this.siteShell.setAttribute('aria-hidden', 'false');

            window.requestAnimationFrame(() => {
                this.siteShell.classList.add('is-visible');
            });
        }

        if (!this.introScreen) {
            return;
        }

        if (skipIntro) {
            this.introScreen.classList.remove('is-exiting');
            this.introScreen.hidden = true;
            this.introScreen.setAttribute('aria-hidden', 'true');
            return;
        }

        this.introScreen.classList.add('is-exiting');
        this.introScreen.setAttribute('aria-hidden', 'true');
        window.setTimeout(() => {
            this.introScreen.hidden = true;
        }, 700);
    }

    wasInvitationStarted() {
        try {
            return window.sessionStorage.getItem(INVITATION_STARTED_STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    }

    markInvitationStarted() {
        try {
            window.sessionStorage.setItem(INVITATION_STARTED_STORAGE_KEY, 'true');
        } catch {
        }
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

    getAudioTracks() {
        const mainTrack = this.config.media?.tracks?.main ?? {};
        const giftTrack = this.config.media?.tracks?.gift ?? {};

        return {
            main: mainTrack,
            gift: giftTrack
        };
    }

    parseCoupleNames() {
        const names = this.config.couple?.names || DEFAULT_SITE_CONTENT.couple.names;
        const parts = names.split('&').map((part) => part.trim()).filter(Boolean);
        const firstName = parts[0] || 'Siannah';
        const secondName = parts[1] || 'Diego';

        return {
            names,
            firstName,
            secondName
        };
    }

    setMeta() {
        const title = this.config.texts?.metaTitle;
        const description = this.config.texts?.metaDescription;
        const themeColor = this.config.texts?.themeColor || window.THEME?.colors?.background;

        if (title) {
            document.title = title;
        }

        const descriptionMeta = document.querySelector('meta[name="description"]');
        if (descriptionMeta && description) {
            descriptionMeta.setAttribute('content', description);
        }

        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta && themeColor) {
            themeMeta.setAttribute('content', themeColor);
        }
    }

    setHero() {
        const names = this.parseCoupleNames();
        const heroImage = this.config.media?.heroImage;
        const introScreenTitle = document.getElementById('introScreenTitle');

        if (introScreenTitle) {
            introScreenTitle.innerHTML = `${names.firstName} <span>&</span> ${names.secondName}`;
        }

        setText('introLabel', this.config.texts?.introLabel);
        setText('introNote', this.config.couple?.subtitle || this.config.texts?.intro);
        setText('heroLabel', this.config.texts?.heroLabel);
        setText('heroName1', names.firstName);
        setText('heroName2', names.secondName);
        setText('heroDate', this.config.event?.heroDate || this.config.event?.displayDate);

        const heroPhoto = document.getElementById('couplePhoto');
        if (heroPhoto && heroImage) {
            heroPhoto.setAttribute('src', heroImage);
        }

        setText('mainFooterNames', names.names);

        if (this.guestTokenData?.group_name) {
            const greeting = document.getElementById('guestGreeting');
            if (greeting) {
                greeting.textContent = `Olá, ${this.guestTokenData.group_name}!`;
                greeting.removeAttribute('hidden');
            }
        }
    }

    setEventDetails() {
        setText('detailDateTitle', this.config.texts?.detailsDateLabel);
        setText('detailTimeTitle', this.config.texts?.detailsTimeLabel);
        setText('detailLocationTitle', this.config.texts?.detailsLocationLabel);
        setText('detailOccasionTitle', this.config.texts?.detailsOccasionLabel);
        setText('detailGiftTitle', this.config.texts?.detailsGiftTitle);
        setText('detailDateValue', this.config.event?.detailDate || this.config.event?.displayDate);
        setText('detailDateSub', this.config.event?.weekday);
        setText('detailTimeValue', this.config.event?.time);
        setText('detailTimeSub', this.config.event?.timezone);
        setText('detailLocationName', this.config.event?.locationName);
        setText('detailLocationCity', this.config.event?.locationCity);
        setText('detailLocationHint', this.config.texts?.detailsLocationHint);
        setText('detailOccasionValue', this.config.texts?.detailsOccasionValue);
        setText('detailOccasionSub', this.config.texts?.detailsOccasionSub);

        const locationLink = document.getElementById('detailLocationLink');
        if (locationLink && this.config.event?.mapsLink) {
            locationLink.setAttribute('href', this.config.event.mapsLink);
            const locationName = this.config.event.locationName || 'local do evento';
            locationLink.setAttribute('aria-label', `Abrir localização de ${locationName} no mapa`);
        }
    }

    setTexts() {
        setText('countdownTag', this.config.texts?.countdownTag);
        setText('countdownTitle', this.config.texts?.countdownTitle);
        setText('detailsTag', this.config.texts?.detailsTag);
        setText('detailsTitle', this.config.texts?.detailsTitle);
        setText('detailsIntro', this.config.texts?.detailsIntro);

        setText('rsvpTag', this.config.texts?.rsvpTag);
        setText('rsvpSectionTitle', this.config.texts?.rsvpTitle);
        setText('rsvpSectionBody', this.config.texts?.rsvpSubtitle);
        setText('rsvpFormTitle', this.config.texts?.rsvpFormTitle);
        setText('rsvpFormSubtitle', this.config.texts?.rsvpFormSubtitle);
        setInputPlaceholder('rsvp-name', this.config.texts?.rsvpPlaceholderName);
        setInputPlaceholder('rsvp-phone', this.config.texts?.rsvpPlaceholderPhone);
        setText('btn-yes', this.config.texts?.rsvpYesLabel);
        setText('btn-no', this.config.texts?.rsvpNoLabel);
        setText('rsvpSubmit', this.config.texts?.rsvpSubmit);
        setText('backToHomeButton', this.config.texts?.backToHomeButton);
        setText('backToExtrasButton', this.config.texts?.backToExtrasButton);

        setText('detailGiftValue', this.config.texts?.detailsGiftValue);
        setText('detailGiftSub', this.config.texts?.detailsGiftSub);
    }

    setGift() {
        setText('giftTag', this.config.texts?.giftTag);
        setText('giftOverlayTitle', this.config.texts?.giftTitle);
        setText('giftIntroText', this.config.texts?.giftIntro);
        setText('giftPixTag', this.config.texts?.giftPixTag);
        setText('giftPixTitle', this.config.texts?.giftPixTitle);
        setText('giftPixDescription', this.config.texts?.giftPixDescription);
        setText('giftPixCopyLabel', this.config.texts?.giftPixCopyLabel);
        setText('giftCardTag', this.config.texts?.giftCardTag);
        setText('giftCardTitle', this.config.texts?.giftCardTitle);
        setText('giftCardBody', this.config.texts?.giftCardBody);

        const pixCode = this.config.gift?.pixKey;
        const pixImage = this.config.gift?.pixQrImage;
        const footerNote = this.config.texts?.footerNote;
        const cardEnabled = this.config.gift?.cardPaymentEnabled === true;
        const cardLink = String(this.config.gift?.cardPaymentLink ?? '').trim();

        setText('mainFooterNote', footerNote);

        if (pixCode) {
            document.querySelectorAll('#pixCode').forEach((element) => {
                element.textContent = pixCode;
            });

            document.querySelectorAll('[data-copy-value]').forEach((button) => {
                button.setAttribute('data-copy-value', pixCode);
            });
        }

        setText('giftPixCopyButton', this.config.texts?.giftPixCopyButton);

        if (pixImage) {
            document.querySelectorAll('#giftPixQr').forEach((image) => {
                image.setAttribute('src', pixImage);
            });
        }

        const cardPanel = document.getElementById('giftCardPanel');
        const cardPlaceholder = document.getElementById('giftCardPlaceholder');
        const cardBody = document.getElementById('giftCardBody');

        if (!cardPanel || !cardPlaceholder) {
            return;
        }

        const hasValidCardLink = (() => {
            if (!cardLink) return false;
            try {
                const parsed = new URL(cardLink, window.location.href);
                return parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch {
                return false;
            }
        })();

        if (!cardEnabled || !hasValidCardLink) {
            cardPanel.hidden = true;
            return;
        }

        cardPanel.hidden = false;
        if (cardBody && !cardBody.textContent?.trim()) {
            cardBody.textContent = this.config.texts?.giftCardBody || '';
        }

        const linkLabel = this.config.texts?.giftCardPlaceholder || 'Pagar com cartão';
        cardPlaceholder.innerHTML = '';

        const cardAnchor = document.createElement('a');
        cardAnchor.className = 'gift-card-link';
        cardAnchor.href = cardLink;
        cardAnchor.target = '_blank';
        cardAnchor.rel = 'noopener noreferrer';
        cardAnchor.textContent = linkLabel;
        cardAnchor.setAttribute('aria-label', `${linkLabel} em nova aba`);

        cardPlaceholder.appendChild(cardAnchor);
    }

    setPages() {
        const extrasSection = document.getElementById('extras');
        const extrasDivider = document.querySelector('.extras-divider');
        const grid = document.getElementById('extrasGrid');

        if (!extrasSection || !grid) {
            return;
        }

        const pages = this.config.pages ?? {};
        const PAGE_ORDER = ['historia', 'faq', 'hospedagem', 'mensagem', 'musica', 'presente'];
        const PAGE_URLS = {
            historia: 'historia.html',
            faq: 'faq.html',
            hospedagem: 'hospedagem.html',
            mensagem: 'mensagem.html',
            musica: 'musica.html',
            presente: 'presente.html'
        };

        const enabledPages = PAGE_ORDER.filter((key) => pages[key]?.enabled === true);

        if (enabledPages.length === 0) {
            return;
        }

        extrasSection.hidden = false;
        if (extrasDivider) {
            extrasDivider.hidden = false;
        }

        grid.innerHTML = enabledPages.map((key) => {
            const page = pages[key];
            const url = PAGE_URLS[key];
            return `<a class="extras-card" href="${url}">
                <span class="extras-card-label">${page.cardLabel ?? ''}</span>
                <span class="extras-card-hint">${page.cardHint ?? ''}</span>
            </a>`;
        }).join('');
    }
}

async function loadLayout(layoutKey) {
    return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `assets/layouts/${layoutKey}/layout.css`;
        link.onload = resolve;
        link.onerror = () => {
            console.warn(`Layout "${layoutKey}" não encontrado. Usando classic.`);
            resolve();
        };
        document.head.appendChild(link);
    });
}

function resolveThemePath(activeTheme, layoutKey) {
    if (!activeTheme) return null;
    if (activeTheme.startsWith('assets/')) return activeTheme; // formato legado
    return `assets/layouts/${layoutKey}/themes/${activeTheme}.json`;
}

async function bootstrap() {
    try {
        await loadDefaults();
        const config = await loadConfig();
        const layoutKey = config.activeLayout || ACTIVE_LAYOUT_KEY;
        await loadLayout(layoutKey);
        const themePath = resolveThemePath(config.activeTheme, layoutKey) ?? ACTIVE_THEME_PATH;
        const [theme, typographyConfig] = await Promise.all([
            loadTheme(themePath),
            loadTypographyConfig()
        ]);
        const themeWithGlobalTypography = mergeThemeWithGlobalTypography(theme, typographyConfig);
        const themeWithSiteOverrides = applySiteThemeOverrides(themeWithGlobalTypography, config, themePath);
        const effectiveTheme = resolveTheme(themeWithSiteOverrides);
        const navigationState = getBootstrapNavigationState();
        window.CONFIG = config;
        window.THEME = effectiveTheme;
        applyTheme(effectiveTheme);
        const experience = new InvitationExperience(config, effectiveTheme, navigationState);
        await experience.init();
        window.dispatchEvent(new CustomEvent('app:ready', { detail: { config, theme: effectiveTheme } }));
    } catch (error) {
        console.error('Falha ao carregar a configuracao da pagina.', error);
    }
}

const shouldAutoBootstrap =
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    window.__INVITATION_DISABLE_BOOTSTRAP__ !== true;

if (shouldAutoBootstrap) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }
}
