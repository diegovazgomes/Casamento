import { WeddingApp } from './main.js';
import { Countdown } from './countdown.js';
import { RSVP } from './rsvp.js';
import { PresentPage } from './presente.js';
import { AudioController } from './audio.js';

const SITE_CONFIG_URL = 'assets/config/site.json';
const THEME_CONFIG_URL = 'assets/config/theme.json';

const DEFAULT_THEME = {
    _comments: {
        colors: {
            background: 'Fundo base do site inteiro.',
            surface: 'Fundo de cards e superficies internas.',
            primary: 'Cor de destaque principal (dourado).',
            primarySoft: 'Cor de destaque secundario (dourado claro).',
            text: 'Texto principal claro.',
            textMuted: 'Texto secundario padrao.',
            border: 'Borda padrao suave em elementos com destaque.'
        },
        typography: {
            fontPrimary: 'Fonte do corpo e textos comuns.',
            fontSerif: 'Fonte de titulos e numeros elegantes.',
            fontAccent: 'Fonte de assinatura para nomes do casal.'
        }
    },
    colors: {
        background: '#1a1714',
        surface: '#201c18',
        surfaceSoft: 'rgba(255, 255, 255, 0.04)',
        primary: '#c9a84c',
        primarySoft: '#e8d08a',
        text: '#faf7f2',
        textMuted: 'rgba(250, 247, 242, 0.6)',
        textSoft: 'rgba(250, 247, 242, 0.62)',
        textDim: 'rgba(250, 247, 242, 0.45)',
        textFaint: 'rgba(250, 247, 242, 0.25)',
        textPlaceholder: 'rgba(250, 247, 242, 0.25)',
        border: 'rgba(201, 168, 76, 0.2)',
        borderSoft: 'rgba(201, 168, 76, 0.16)',
        borderStrong: 'rgba(201, 168, 76, 0.38)',
        goldSurfaceSoft: 'rgba(201, 168, 76, 0.06)',
        goldSurface: 'rgba(201, 168, 76, 0.08)',
        goldSurfaceStrong: 'rgba(201, 168, 76, 0.15)',
        primaryGlow: 'rgba(201, 168, 76, 0.12)',
        pageGridLine: 'rgba(255, 255, 255, 0.015)',
        overlayBackdrop: 'rgba(10, 8, 7, 0.78)',
        audioPanelBg: 'rgba(17, 14, 12, 0.68)',
        audioPanelHoverBg: 'rgba(17, 14, 12, 0.8)',
        audioPanelBorder: 'rgba(201, 168, 76, 0.24)',
        pulseRing: 'rgba(201, 168, 76, 0.45)',
        pulseRingSpread: 'rgba(201, 168, 76, 0)',
        inputFocusBg: 'rgba(255, 255, 255, 0.06)'
    },
    typography: {
        fontPrimary: "'Jost', sans-serif",
        fontSerif: "'Cormorant Garamond', serif",
        fontAccent: "'Great Vibes', cursive"
    },
    spacing: {
        sectionPadding: 88,
        containerWidth: 760,
        cardPadding: 28
    },
    radius: {
        card: 0,
        button: 0
    },
    effects: {
        shadowSoft: '0 20px 60px rgba(0,0,0,0.28)',
        shadowHover: '0 12px 28px rgba(0,0,0,0.18)',
        textShadowStrong: '0 8px 28px rgba(0,0,0,0.32)',
        textShadowSoft: '0 2px 18px rgba(0,0,0,0.3)',
        focusRing: '0 0 0 3px rgba(201,168,76,0.12)',
        transition: 'all 0.3s ease',
        pageGradient: 'linear-gradient(180deg, #1a1714 0%, #1a1714 100%)',
        introBackdropGradient: 'linear-gradient(180deg, rgba(10, 8, 7, 0.96) 0%, rgba(18, 15, 13, 0.96) 45%, rgba(26, 23, 20, 0.98) 100%)',
        introCardGradient: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(201, 168, 76, 0.03))',
        buttonFillGradient: 'linear-gradient(135deg, rgba(201, 168, 76, 0.95), rgba(232, 208, 138, 0.95))',
        heroOverlayGradient: 'linear-gradient(to bottom, rgba(26, 23, 20, 0.1) 0%, rgba(26, 23, 20, 0.18) 40%, rgba(26, 23, 20, 0.78) 76%, rgba(26, 23, 20, 1) 100%)',
        overlayPanelGradient: 'linear-gradient(180deg, rgba(15, 12, 10, 0.98) 0%, rgba(24, 21, 18, 0.98) 100%)',
        overlayCloseGradient: 'linear-gradient(180deg, rgba(15, 12, 10, 0.92), rgba(15, 12, 10, 0))',
        rsvpPanelGradient: 'linear-gradient(135deg, rgba(201, 168, 76, 0.05), rgba(201, 168, 76, 0.015))',
        giftPanelGradient: 'linear-gradient(135deg, rgba(201, 168, 76, 0.05), rgba(255, 255, 255, 0.02))'
    },
    animation: {
        fadeDuration: 0.8,
        staggerDelay: 0.1
    }
};

const DEFAULT_SITE_CONTENT = {
    couple: {
        names: 'Siannah & Diego',
        subtitle: 'Seguimos escolhendo um ao outro, agora para todo sempre.'
    },
    event: {
        date: '2026-09-06T17:00:00-03:00',
        heroDate: '06 . 09 . 2026',
        detailDate: '06 Set 2026',
        weekday: 'Domingo',
        time: '17:00',
        timezone: 'Horário de Brasília',
        locationName: 'Mansão Ilha de Capri',
        locationCity: 'São Bernardo do Campo',
        mapsLink: 'https://share.google/7Qt15gWSb3IAGGofM'
    },
    texts: {
        metaTitle: 'Siannah & Diego - Casamento',
        metaDescription: 'Siannah e Diego convidam você para celebrar o casamento em uma noite elegante e inesquecível.',
        themeColor: '#1a1714',
        introLabel: 'Convite',
        intro: 'Seguimos escolhendo um ao outro, agora para todo sempre.',
        heroLabel: 'Você foi convidado para o casamento de',
        countdownTag: 'Contagem Regressiva',
        countdownTitle: 'O grande dia se aproxima!',
        countdownFinished: 'O grande dia chegou.',
        detailsTag: 'Detalhes da Cerimônia',
        detailsTitle: 'O início de tudo o que queremos viver juntos.',
        detailsIntro: 'Uma celebração íntima, pensada para compartilhar esse momento com quem faz parte da nossa história.',
        detailsDateLabel: 'Data',
        detailsTimeLabel: 'Horário',
        detailsLocationLabel: 'Local',
        detailsOccasionLabel: 'Ocasião',
        detailsOccasionValue: 'Cerimônia & Recepção',
        detailsOccasionSub: 'Traje esporte fino',
        detailsLocationHint: '📍 Abrir no mapa',
        detailsGiftTitle: 'Presente',
        detailsGiftValue: 'Para nos presentear',
        detailsGiftSub: 'Abrir opções',
        rsvpTag: 'Confirmação de Presença',
        rsvpTitle: 'Esperamos você.',
        rsvpSubtitle: 'Pedimos, por gentileza, que confirme sua presença o quanto antes. Sua presença tornará este momento ainda mais especial para nós.',
        rsvpFormTitle: 'Confirmar Presença',
        rsvpFormSubtitle: 'Preencha os dados para continuar no WhatsApp',
        rsvpPlaceholderName: 'Seu nome completo',
        rsvpPlaceholderPhone: 'Seu WhatsApp',
        rsvpYesLabel: 'Confirmo presença',
        rsvpNoLabel: 'Não poderei ir',
        rsvpSubmit: 'Continuar no WhatsApp',
        giftTag: 'Presente',
        giftTitle: 'Para nos presentear',
        giftIntro: 'Sua presença já é o nosso maior presente. Mas, se desejar nos presentear de outra forma, deixamos abaixo algumas opções com carinho.',
        giftPixTag: 'Pix',
        giftPixTitle: 'Pix do casal',
        giftPixDescription: 'Se preferir, você pode nos presentear por Pix usando o QR Code ou o código abaixo.',
        giftPixCopyLabel: 'Pix copia e cola',
        giftPixCopyButton: 'Copiar código Pix',
        giftCardTag: 'Pagamento por cartão',
        giftCardTitle: 'Pagamento por cartão',
        giftCardBody: 'Em breve, esta opção estará disponível.',
        giftCardPlaceholder: 'Espaço reservado para inserir o link ou a plataforma de pagamento por cartão.',
        footerNote: '06 . 09 . 2026 | São Bernardo do Campo'
    },
    gift: {
        pixKey: 'CHAVE_PIX_OU_CODIGO_COPIA_E_COLA_AQUI',
        pixQrImage: 'assets/images/icons/pix-placeholder.svg'
    },
    media: {
        heroImage: 'assets/images/couple/casal.png',
        tracks: {
            main: {
                src: 'assets/audio/main-theme.mp3',
                volume: 0.14,
                startTime: 8
            },
            gift: {
                src: 'assets/audio/gift-theme.mp3',
                volume: 0.12,
                startTime: 78
            }
        }
    },
    whatsapp: {
        destinationPhone: '5511914772174',
        recipientName: 'Siannah',
        redirectDelayMs: 5000,
        messages: {
            attending: 'Olá, {recipientName}!\n\nAqui é {name}.\nMeu WhatsApp para contato é {phone}.\nEstou passando para confirmar minha presença no casamento.\n\nNos vemos em breve.',
            notAttending: 'Olá, {recipientName}!\n\nAqui é {name}.\nMeu WhatsApp para contato é {phone}.\nInfelizmente, não poderei estar presente no casamento.\n\nAgradeço muito pelo convite e desejo um dia lindo para vocês.'
        },
        feedback: {
            attending: {
                title: 'Presença confirmada, {firstName}.',
                subtitle: 'Sua mensagem está pronta e vamos te levar ao WhatsApp para finalizar o envio com carinho.',
                note: 'Abrindo o WhatsApp em {delaySeconds} segundos'
            },
            notAttending: {
                title: 'Obrigada pelo aviso, {firstName}.',
                subtitle: 'Sua mensagem de ausência está pronta para seguir ao WhatsApp com todo o carinho que este momento merece.',
                note: 'Abrindo o WhatsApp em {delaySeconds} segundos'
            },
            error: {
                title: 'Não foi possível continuar.',
                subtitle: 'Confira os dados informados e tente novamente em instantes.',
                note: ''
            }
        }
    }
};

function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function applyTheme(theme) {
    const root = document.documentElement;
    const colors = theme?.colors ?? {};
    const typography = theme?.typography ?? {};
    const spacing = theme?.spacing ?? {};
    const radius = theme?.radius ?? {};
    const effects = theme?.effects ?? {};
    const animation = theme?.animation ?? {};

    const cssVars = {
        '--color-bg': colors.background ?? DEFAULT_THEME.colors.background,
        '--color-surface': colors.surface ?? DEFAULT_THEME.colors.surface,
        '--color-primary': colors.primary ?? DEFAULT_THEME.colors.primary,
        '--color-primary-soft': colors.primarySoft ?? DEFAULT_THEME.colors.primarySoft,
        '--color-text': colors.text ?? DEFAULT_THEME.colors.text,
        '--color-text-muted': colors.textMuted ?? DEFAULT_THEME.colors.textMuted,
        '--color-border': colors.border ?? DEFAULT_THEME.colors.border,
        '--color-border-soft': colors.borderSoft ?? DEFAULT_THEME.colors.borderSoft,
        '--color-border-strong': colors.borderStrong ?? DEFAULT_THEME.colors.borderStrong,
        '--color-text-soft': colors.textSoft ?? DEFAULT_THEME.colors.textSoft,
        '--color-text-dim': colors.textDim ?? DEFAULT_THEME.colors.textDim,
        '--color-text-faint': colors.textFaint ?? DEFAULT_THEME.colors.textFaint,
        '--color-text-placeholder': colors.textPlaceholder ?? DEFAULT_THEME.colors.textPlaceholder,
        '--color-surface-soft': colors.surfaceSoft ?? DEFAULT_THEME.colors.surfaceSoft,
        '--color-gold-surface-soft': colors.goldSurfaceSoft ?? DEFAULT_THEME.colors.goldSurfaceSoft,
        '--color-gold-surface': colors.goldSurface ?? DEFAULT_THEME.colors.goldSurface,
        '--color-gold-surface-strong': colors.goldSurfaceStrong ?? DEFAULT_THEME.colors.goldSurfaceStrong,
        '--color-primary-glow': colors.primaryGlow ?? DEFAULT_THEME.colors.primaryGlow,
        '--color-page-grid-line': colors.pageGridLine ?? DEFAULT_THEME.colors.pageGridLine,
        '--color-overlay-backdrop': colors.overlayBackdrop ?? DEFAULT_THEME.colors.overlayBackdrop,
        '--color-audio-bg': colors.audioPanelBg ?? DEFAULT_THEME.colors.audioPanelBg,
        '--color-audio-hover-bg': colors.audioPanelHoverBg ?? DEFAULT_THEME.colors.audioPanelHoverBg,
        '--color-audio-border': colors.audioPanelBorder ?? DEFAULT_THEME.colors.audioPanelBorder,
        '--color-pulse-ring': colors.pulseRing ?? DEFAULT_THEME.colors.pulseRing,
        '--color-pulse-ring-spread': colors.pulseRingSpread ?? DEFAULT_THEME.colors.pulseRingSpread,
        '--color-input-focus-bg': colors.inputFocusBg ?? DEFAULT_THEME.colors.inputFocusBg,
        '--font-primary': typography.fontPrimary ?? DEFAULT_THEME.typography.fontPrimary,
        '--font-serif': typography.fontSerif ?? DEFAULT_THEME.typography.fontSerif,
        '--font-accent': typography.fontAccent ?? DEFAULT_THEME.typography.fontAccent,
        '--spacing-section': `${spacing.sectionPadding ?? DEFAULT_THEME.spacing.sectionPadding}px`,
        '--container-width': `${spacing.containerWidth ?? DEFAULT_THEME.spacing.containerWidth}px`,
        '--card-padding': `${spacing.cardPadding ?? DEFAULT_THEME.spacing.cardPadding}px`,
        '--radius-card': `${radius.card ?? DEFAULT_THEME.radius.card}px`,
        '--radius-button': `${radius.button ?? DEFAULT_THEME.radius.button}px`,
        '--shadow-soft': effects.shadowSoft ?? DEFAULT_THEME.effects.shadowSoft,
        '--shadow-hover': effects.shadowHover ?? DEFAULT_THEME.effects.shadowHover,
        '--shadow-text-strong': effects.textShadowStrong ?? DEFAULT_THEME.effects.textShadowStrong,
        '--shadow-text-soft': effects.textShadowSoft ?? DEFAULT_THEME.effects.textShadowSoft,
        '--focus-ring': effects.focusRing ?? DEFAULT_THEME.effects.focusRing,
        '--transition-standard': effects.transition ?? DEFAULT_THEME.effects.transition,
        '--page-gradient': effects.pageGradient ?? DEFAULT_THEME.effects.pageGradient,
        '--intro-backdrop-gradient': effects.introBackdropGradient ?? DEFAULT_THEME.effects.introBackdropGradient,
        '--intro-card-gradient': effects.introCardGradient ?? DEFAULT_THEME.effects.introCardGradient,
        '--button-fill-gradient': effects.buttonFillGradient ?? DEFAULT_THEME.effects.buttonFillGradient,
        '--hero-overlay-gradient': effects.heroOverlayGradient ?? DEFAULT_THEME.effects.heroOverlayGradient,
        '--overlay-panel-gradient': effects.overlayPanelGradient ?? DEFAULT_THEME.effects.overlayPanelGradient,
        '--overlay-close-gradient': effects.overlayCloseGradient ?? DEFAULT_THEME.effects.overlayCloseGradient,
        '--rsvp-panel-gradient': effects.rsvpPanelGradient ?? DEFAULT_THEME.effects.rsvpPanelGradient,
        '--gift-panel-gradient': effects.giftPanelGradient ?? DEFAULT_THEME.effects.giftPanelGradient,
        '--fade-duration': `${animation.fadeDuration ?? DEFAULT_THEME.animation.fadeDuration}s`,
        '--stagger-delay': `${animation.staggerDelay ?? DEFAULT_THEME.animation.staggerDelay}s`,
        '--cream': colors.text ?? DEFAULT_THEME.colors.text,
        '--gold': colors.primary ?? DEFAULT_THEME.colors.primary,
        '--gold-light': colors.primarySoft ?? DEFAULT_THEME.colors.primarySoft,
        '--dark': colors.background ?? DEFAULT_THEME.colors.background,
        '--border-soft': colors.border ?? DEFAULT_THEME.colors.border,
        '--surface-soft': colors.surfaceSoft ?? DEFAULT_THEME.colors.surfaceSoft
    };

    Object.entries(cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
}

function applyConfig(config) {
    const root = document.documentElement;
    const spacing = config.spacing ?? {};
    const scale = spacing.scale ?? {};
    const semantic = spacing.semantic ?? {};
    const type = config.fontSizes?.semantic ?? {};
    const componentSizes = config.componentSizes ?? {};
    const cssVars = {
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

function cloneDeep(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneDeep(item));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nested]) => [key, cloneDeep(nested)])
        );
    }

    return value;
}

function mergeDeep(base, override) {
    const output = cloneDeep(base);

    if (!override || typeof override !== 'object') {
        return output;
    }

    Object.entries(override).forEach(([key, value]) => {
        const current = output[key];

        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            current &&
            typeof current === 'object' &&
            !Array.isArray(current)
        ) {
            output[key] = mergeDeep(current, value);
            return;
        }

        if (value !== null && value !== undefined) {
            output[key] = value;
        }
    });

    return output;
}

async function loadConfig() {
    const configPath = isMobileViewport() ? '../config/mobile.js' : '../config/desktop.js';
    const module = await import(configPath);
    const baseConfig = mergeDeep(module.CONFIG, DEFAULT_SITE_CONTENT);

    try {
        const response = await fetch(SITE_CONFIG_URL, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`site.json returned HTTP ${response.status}`);
        }

        const siteConfig = await response.json();
        return mergeDeep(baseConfig, siteConfig);
    } catch (error) {
        console.warn('Falha ao carregar assets/config/site.json. Usando fallback local.', error);
        return baseConfig;
    }
}

async function loadTheme() {
    const baseTheme = cloneDeep(DEFAULT_THEME);

    try {
        const response = await fetch(THEME_CONFIG_URL, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`theme.json returned HTTP ${response.status}`);
        }

        const themeConfig = await response.json();
        return mergeDeep(baseTheme, themeConfig);
    } catch (error) {
        console.warn('Falha ao carregar assets/config/theme.json. Usando fallback local.', error);
        return baseTheme;
    }
}

class InvitationExperience {
    constructor(config) {
        this.config = config;
        this.weddingApp = null;
        this.countdown = null;
        this.rsvp = null;
        this.presentPage = new PresentPage();
        this.audio = new AudioController(this.getAudioTracks());
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
        this.setMeta();
        this.setHero();
        this.setEventDetails();
        this.setTexts();
        this.setGift();
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

        const eventDate = this.config.event?.date || DEFAULT_SITE_CONTENT.event.date;

        this.weddingApp = new WeddingApp(this.config);
        this.countdown = new Countdown(eventDate, this.config);
        this.rsvp = new RSVP({
            whatsapp: this.config.whatsapp
        });

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

    setText(id, value) {
        if (value === undefined || value === null || value === '') {
            return;
        }

        const element = document.getElementById(id);
        if (!element) {
            return;
        }

        element.textContent = value;
    }

    setInputPlaceholder(id, value) {
        if (!value) {
            return;
        }

        const element = document.getElementById(id);
        if (!element) {
            return;
        }

        element.setAttribute('placeholder', value);
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

        this.setText('introLabel', this.config.texts?.introLabel);
        this.setText('introNote', this.config.couple?.subtitle || this.config.texts?.intro);
        this.setText('heroLabel', this.config.texts?.heroLabel);
        this.setText('heroName1', names.firstName);
        this.setText('heroName2', names.secondName);
        this.setText('heroDate', this.config.event?.heroDate || this.config.event?.displayDate);

        const heroPhoto = document.getElementById('couplePhoto');
        if (heroPhoto && heroImage) {
            heroPhoto.setAttribute('src', heroImage);
        }

        this.setText('mainFooterNames', names.names);
        this.setText('overlayFooterNames', names.names);
    }

    setEventDetails() {
        this.setText('detailDateTitle', this.config.texts?.detailsDateLabel);
        this.setText('detailTimeTitle', this.config.texts?.detailsTimeLabel);
        this.setText('detailLocationTitle', this.config.texts?.detailsLocationLabel);
        this.setText('detailOccasionTitle', this.config.texts?.detailsOccasionLabel);
        this.setText('detailGiftTitle', this.config.texts?.detailsGiftTitle);
        this.setText('detailDateValue', this.config.event?.detailDate || this.config.event?.displayDate);
        this.setText('detailDateSub', this.config.event?.weekday);
        this.setText('detailTimeValue', this.config.event?.time);
        this.setText('detailTimeSub', this.config.event?.timezone);
        this.setText('detailLocationName', this.config.event?.locationName);
        this.setText('detailLocationCity', this.config.event?.locationCity);
        this.setText('detailLocationHint', this.config.texts?.detailsLocationHint);
        this.setText('detailOccasionValue', this.config.texts?.detailsOccasionValue);
        this.setText('detailOccasionSub', this.config.texts?.detailsOccasionSub);

        const locationLink = document.getElementById('detailLocationLink');
        if (locationLink && this.config.event?.mapsLink) {
            locationLink.setAttribute('href', this.config.event.mapsLink);
            const locationName = this.config.event.locationName || 'local do evento';
            locationLink.setAttribute('aria-label', `Abrir localização de ${locationName} no mapa`);
        }
    }

    setTexts() {
        this.setText('countdownTag', this.config.texts?.countdownTag);
        this.setText('countdownTitle', this.config.texts?.countdownTitle);
        this.setText('detailsTag', this.config.texts?.detailsTag);
        this.setText('detailsTitle', this.config.texts?.detailsTitle);
        this.setText('detailsIntro', this.config.texts?.detailsIntro);

        this.setText('rsvpTag', this.config.texts?.rsvpTag);
        this.setText('rsvpSectionTitle', this.config.texts?.rsvpTitle);
        this.setText('rsvpSectionBody', this.config.texts?.rsvpSubtitle);
        this.setText('rsvpFormTitle', this.config.texts?.rsvpFormTitle);
        this.setText('rsvpFormSubtitle', this.config.texts?.rsvpFormSubtitle);
        this.setInputPlaceholder('rsvp-name', this.config.texts?.rsvpPlaceholderName);
        this.setInputPlaceholder('rsvp-phone', this.config.texts?.rsvpPlaceholderPhone);
        this.setText('btn-yes', this.config.texts?.rsvpYesLabel);
        this.setText('btn-no', this.config.texts?.rsvpNoLabel);
        this.setText('rsvpSubmit', this.config.texts?.rsvpSubmit);

        this.setText('detailGiftValue', this.config.texts?.detailsGiftValue);
        this.setText('detailGiftSub', this.config.texts?.detailsGiftSub);
    }

    setGift() {
        this.setText('giftTag', this.config.texts?.giftTag);
        this.setText('giftOverlayTitle', this.config.texts?.giftTitle);
        this.setText('giftIntroText', this.config.texts?.giftIntro);
        this.setText('giftPixTag', this.config.texts?.giftPixTag);
        this.setText('giftPixTitle', this.config.texts?.giftPixTitle);
        this.setText('giftPixDescription', this.config.texts?.giftPixDescription);
        this.setText('giftPixCopyLabel', this.config.texts?.giftPixCopyLabel);
        this.setText('giftCardTag', this.config.texts?.giftCardTag);
        this.setText('giftCardTitle', this.config.texts?.giftCardTitle);
        this.setText('giftCardBody', this.config.texts?.giftCardBody);
        this.setText('giftCardPlaceholder', this.config.texts?.giftCardPlaceholder);

        const pixCode = this.config.gift?.pixKey;
        const pixImage = this.config.gift?.pixQrImage;
        const footerNote = this.config.texts?.footerNote;

        this.setText('mainFooterNote', footerNote);
        this.setText('overlayFooterNote', footerNote);

        if (pixCode) {
            document.querySelectorAll('#pixCode').forEach((element) => {
                element.textContent = pixCode;
            });

            document.querySelectorAll('[data-copy-value]').forEach((button) => {
                button.setAttribute('data-copy-value', pixCode);
            });
        }

        this.setText('giftPixCopyButton', this.config.texts?.giftPixCopyButton);

        if (pixImage) {
            document.querySelectorAll('#giftPixQr').forEach((image) => {
                image.setAttribute('src', pixImage);
            });
        }
    }
}

async function bootstrap() {
    try {
        const [config, theme] = await Promise.all([loadConfig(), loadTheme()]);
        window.CONFIG = config;
        window.THEME = theme;
        applyTheme(theme);
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
