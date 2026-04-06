import { WeddingApp } from './main.js';
import { Countdown } from './countdown.js';
import { RSVP } from './rsvp.js';
import { PresentPage } from './presente.js';
import { AudioController } from './audio.js';

const SITE_CONFIG_URL = 'assets/config/site.json';
const INVITATION_STARTED_STORAGE_KEY = 'wedding-invitation-started';
const NAVIGATION_SECTION_PARAM = 'section';

// Para trocar o tema, altere apenas esta constante.
// Temas disponíveis: classic-gold.json, classic-silver.json
const ACTIVE_THEME_PATH = 'assets/config/themes/classic-silver.json';

const DEFAULT_THEME = {
    colors: {
        background: '#1a1714',
        surface: '#201c18',
        surfaceSoft: 'rgba(255,255,255,0.04)',
        primary: '#c9a84c',
        primarySoft: '#e8d08a',
        text: '#faf7f2',
        textMuted: 'rgba(250,247,242,0.6)',
        textSoft: 'rgba(250,247,242,0.62)',
        textDim: 'rgba(250,247,242,0.45)',
        textFaint: 'rgba(250,247,242,0.25)',
        textPlaceholder: 'rgba(250,247,242,0.25)',
        border: 'rgba(201,168,76,0.2)',
        borderSoft: 'rgba(201,168,76,0.16)',
        borderStrong: 'rgba(201,168,76,0.38)',
        goldSurfaceSoft: 'rgba(201,168,76,0.06)',
        goldSurface: 'rgba(201,168,76,0.08)',
        goldSurfaceStrong: 'rgba(201,168,76,0.15)',
        primaryGlow: 'rgba(201,168,76,0.12)',
        pageGridLine: 'rgba(255,255,255,0.015)',
        overlayBackdrop: 'rgba(10,8,7,0.78)',
        audioPanelBg: 'rgba(17,14,12,0.68)',
        audioPanelHoverBg: 'rgba(17,14,12,0.8)',
        audioPanelBorder: 'rgba(201,168,76,0.24)',
        pulseRing: 'rgba(201,168,76,0.45)',
        pulseRingSpread: 'rgba(201,168,76,0)',
        inputFocusBg: 'rgba(255,255,255,0.06)'
    },
    typography: {
        fonts: {
            primary: "'Jost', sans-serif",
            serif: "'Cormorant Garamond', serif",
            accent: "'Great Vibes', cursive"
        },
        sizes: {
            base: '13px',
            heroLabel: '10px',
            heroDate: '11px',
            heroNames: { min: '54px', fluid: '12vw', max: '110px' },
            scrollHint: '9px',
            sectionTag: '9px',
            sectionTitle: { min: '34px', fluid: '7vw', max: '56px' },
            sectionBody: '13px',
            countdownNumber: '42px',
            countdownLabel: '8px',
            countdownFinished: '30px',
            detailIcon: '18px',
            detailTitle: '8px',
            detailValue: '20px',
            detailSub: '10px',
            rsvpTitle: '38px',
            rsvpSubtitle: '11px',
            rsvpInput: '12px',
            rsvpChoice: '10px',
            rsvpSubmit: '10px',
            rsvpSuccessText: '26px',
            rsvpSuccessSub: '11px',
            footerNames: '30px',
            footerNote: '10px'
        }
    },
    spacing: {
        containerWidth: '760px',
        cardPadding: '28px',
        sectionPaddingTop: '88px',
        sectionPaddingInline: '24px',
        detailsSectionPaddingTop: '88px',
        sectionTagGap: '30px',
        sectionTitleGap: '22px',
        heroLabelGap: '16px',
        heroDateGap: '22px',
        scrollHintBottom: '20px',
        scrollHintGap: '8px',
        dividerMarginTop: '56px',
        countdownMarginTop: '40px',
        countdownGap: '12px',
        detailsMarginTop: '40px',
        detailsGridGap: '1px',
        detailCardPaddingBlock: '28px',
        detailCardPaddingInline: '20px',
        rsvpShellPaddingBottom: '88px',
        rsvpCardMarginTop: '40px',
        rsvpCardPaddingBlock: '48px',
        rsvpCardPaddingInline: '32px',
        rsvpSubtitleGap: '32px',
        rsvpFormGap: '14px',
        rsvpChoiceGap: '10px',
        rsvpSubmitMarginTop: '8px',
        footerPaddingBottom: '48px'
    },
    layout: {
        heroHeight: '100vh',
        heroPadding: '0 24px 64px',
        heroContentWidth: '720px',
        heroContentPaddingBottom: '36px',
        heroFadeOffset: '44px',
        contentMaxWidth: '760px'
    },
    components: {
        dividerWidth: '320px',
        dividerDiamond: '6px',
        scrollArrowWidth: '14px',
        scrollArrowHeight: '48px',
        scrollArrowStemHeight: '36px',
        scrollArrowHeadSize: '8px',
        countdownCardPaddingTop: '22px',
        countdownCardPaddingInline: '8px',
        countdownCardPaddingBottom: '16px',
        rsvpInputPaddingBlock: '14px',
        rsvpInputPaddingInline: '18px',
        rsvpChoiceMinHeight: '48px',
        rsvpChoicePadding: '12px',
        rsvpSubmitPaddingBlock: '16px',
        rsvpSubmitPaddingInline: '32px',
        rsvpSuccessIcon: '32px'
    },
    radius: {
        card: '0px',
        button: '0px'
    },
    effects: {
        shadowSoft: '0 20px 60px rgba(0,0,0,0.28)',
        shadowHover: '0 12px 28px rgba(0,0,0,0.18)',
        textShadowStrong: '0 8px 28px rgba(0,0,0,0.32)',
        textShadowSoft: '0 2px 18px rgba(0,0,0,0.3)',
        focusRing: '0 0 0 3px rgba(201,168,76,0.12)',
        transition: 'all 0.3s ease',
        pageGradient: 'linear-gradient(180deg, #1a1714 0%, #1a1714 100%)',
        introBackdropGradient: 'linear-gradient(180deg, rgba(10,8,7,0.96) 0%, rgba(18,15,13,0.96) 45%, rgba(26,23,20,0.98) 100%)',
        introCardGradient: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(201,168,76,0.03))',
        buttonFillGradient: 'linear-gradient(135deg, rgba(201,168,76,0.95), rgba(232,208,138,0.95))',
        heroOverlayGradient: 'linear-gradient(to bottom, rgba(26,23,20,0.1) 0%, rgba(26,23,20,0.18) 40%, rgba(26,23,20,0.78) 76%, rgba(26,23,20,1) 100%)',
        overlayPanelGradient: 'linear-gradient(180deg, rgba(15,12,10,0.98) 0%, rgba(24,21,18,0.98) 100%)',
        overlayCloseGradient: 'linear-gradient(180deg, rgba(15,12,10,0.92), rgba(15,12,10,0))',
        rsvpPanelGradient: 'linear-gradient(135deg, rgba(201,168,76,0.05), rgba(201,168,76,0.015))',
        giftPanelGradient: 'linear-gradient(135deg, rgba(201,168,76,0.05), rgba(255,255,255,0.02))'
    },
    animation: {
        fadeDuration: '0.8s',
        staggerDelay: '0.1s',
        heroFadeDuration: '1.35s',
        heroRevealDelayMs: 320
    },
    countdown: {
        format: 'two-digits',
        updateInterval: 1000
    },
    responsive: {
        mobile: {
            typography: {
                sizes: {
                    base: '12px',
                    heroDate: '14px',
                    heroNames: { min: '24px', fluid: '10vw', max: '46px' }
                }
            },
            spacing: {
                sectionPaddingTop: '40px',
                sectionPaddingInline: '20px',
                detailsSectionPaddingTop: '40px'
            },
            layout: {
                heroHeight: '680px',
                heroPadding: '0 20px 72px',
                heroContentWidth: '340px',
                heroContentPaddingBottom: '32px',
                heroFadeOffset: '20px',
                contentMaxWidth: '620px'
            },
            animation: {
                heroFadeDuration: '2.15s',
                heroRevealDelayMs: 1260
            }
        }
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

function getBootstrapNavigationState() {
    const bootstrapState = window.__INVITATION_BOOTSTRAP__ ?? {};

    return {
        shouldSkipIntro: Boolean(bootstrapState.shouldSkipIntro),
        navigationTarget: bootstrapState.navigationTarget || null
    };
}

// Resolve o tema final aplicando overrides de mobile quando necessário.
function resolveTheme(theme) {
    if (!isMobileViewport() || !theme.responsive?.mobile) {
        return theme;
    }

    return mergeDeep(theme, theme.responsive.mobile);
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
        '--color-audio-bg': colors.audioPanelBg ?? dt.colors.audioPanelBg,
        '--color-audio-hover-bg': colors.audioPanelHoverBg ?? dt.colors.audioPanelHoverBg,
        '--color-audio-border': colors.audioPanelBorder ?? dt.colors.audioPanelBorder,
        '--color-pulse-ring': colors.pulseRing ?? dt.colors.pulseRing,
        '--color-pulse-ring-spread': colors.pulseRingSpread ?? dt.colors.pulseRingSpread,
        '--color-input-focus-bg': colors.inputFocusBg ?? dt.colors.inputFocusBg,
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
        '--hero-fade-duration': animation.heroFadeDuration ?? dt.animation.heroFadeDuration
    };

    Object.entries(cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, String(value));
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
        return mergeDeep(DEFAULT_SITE_CONTENT, siteConfig);
    } catch (error) {
        console.warn('Falha ao carregar assets/config/site.json. Usando fallback local.', error);
        return cloneDeep(DEFAULT_SITE_CONTENT);
    }
}

async function loadTheme(themePath) {
    const baseTheme = cloneDeep(DEFAULT_THEME);

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
        return mergeDeep(baseTheme, themeConfig);
    } catch (error) {
        console.warn(`Falha ao carregar ${themePath}. Usando fallback local.`, error);
        return baseTheme;
    }
}

class InvitationExperience {
    constructor(config, theme, navigationState = {}) {
        this.config = config;
        this.theme = theme;
        this.navigationState = navigationState;
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
        this.setMeta();
        this.setHero();
        this.setEventDetails();
        this.setTexts();
        this.setGift();
        this.setPages();
        this.presentPage.init();
        this.bindIntro();
        this.bindGiftOverlay();
        this.bindAudioToggle();
        this.bindKeyboardShortcuts();
        this.audio.addEventListener('statechange', () => this.syncAudioButton());
        this.syncAudioButton();

        if (!this.siteShell) {
            this.enterInvitation({ skipIntro: true });
            return;
        }

        if (!this.introScreen || !this.openInviteButton || this.navigationState.shouldSkipIntro || this.wasInvitationStarted()) {
            this.enterInvitation({
                skipIntro: true,
                targetSection: this.navigationState.navigationTarget,
                forceTop: !this.navigationState.navigationTarget && window.location.hash !== '#gift'
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
        const themeAnimation = this.theme?.animation ?? DEFAULT_THEME.animation;
        const themeCountdown = this.theme?.countdown ?? DEFAULT_THEME.countdown;

        this.weddingApp = new WeddingApp({ animation: { delay: themeAnimation.heroRevealDelayMs ?? 300 } });
        this.countdown = new Countdown(eventDate, { countdown: themeCountdown });
        this.rsvp = new RSVP({
            whatsapp: this.config.whatsapp
        });

        this.weddingApp.init();
        this.countdown.start();
        this.rsvp.init();
        this.mainInitialized = true;

        window.addEventListener('beforeunload', () => this.countdown?.stop(), { once: true });
    }

    getInitialAudioContext() {
        const isGiftOrExtraPage = document.body.classList.contains('gift-page') || document.body.classList.contains('extra-page');
        return isGiftOrExtraPage ? 'gift' : 'main';
    }

    async enterInvitation({ skipIntro = false, targetSection = null, forceTop = false, audioPromise = null } = {}) {
        if (this.hasStarted) {
            this.applyStartedState({ skipIntro: true });
            this.navigateWithinInvitation({ targetSection, forceTop });
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

        this.navigateWithinInvitation({ targetSection, forceTop });
    }

    navigateWithinInvitation({ targetSection = null, forceTop = false } = {}) {
        const hash = window.location.hash;

        if (hash === '#gift') {
            window.setTimeout(() => this.openGiftOverlay(), 420);
            return;
        }

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

    setPages() {
        const extrasSection = document.getElementById('extras');
        const extrasDivider = document.querySelector('.extras-divider');
        const grid = document.getElementById('extrasGrid');

        if (!extrasSection || !grid) {
            return;
        }

        const pages = this.config.pages ?? {};
        const PAGE_ORDER = ['historia', 'faq', 'hospedagem', 'presente'];
        const PAGE_URLS = {
            historia: 'historia.html',
            faq: 'faq.html',
            hospedagem: 'hospedagem.html',
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

async function bootstrap() {
    try {
        const [config, theme] = await Promise.all([loadConfig(), loadTheme(ACTIVE_THEME_PATH)]);
        const effectiveTheme = resolveTheme(theme);
        const navigationState = getBootstrapNavigationState();
        window.CONFIG = config;
        window.THEME = effectiveTheme;
        applyTheme(effectiveTheme);
        const experience = new InvitationExperience(config, effectiveTheme, navigationState);
        experience.init();
        window.dispatchEvent(new CustomEvent('app:ready', { detail: { config, theme: effectiveTheme } }));
    } catch (error) {
        console.error('Falha ao carregar a configuracao da pagina.', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
    bootstrap();
}
