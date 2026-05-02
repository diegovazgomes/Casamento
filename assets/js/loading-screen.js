/**
 * Loading Screen Module
 *
 * Gerencia a tela de carregamento em duas fases:
 * - Fase 1: identidade Devasi antes de carregar config
 * - Fase 2: visual do convite com iniciais/data dinamicas
 */

import { resolveSiteConfigSource } from './config-source.js';

const LOADING_SCREEN_HTML = `
<div class="loading-screen" id="loadingScreen" aria-hidden="true">
    <div class="loading-backdrop"></div>
    <div class="loading-phase loading-phase--brand" id="loadingPhaseBrand" role="status" aria-live="polite" aria-label="Carregando">
        <div class="brand-loader-art" aria-hidden="true">
            <svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                <rect width="1080" height="1920" fill="#0e0d0b"></rect>
                <text x="540" y="820" font-size="16" font-weight="500" letter-spacing="7" fill="#c9a55a" fill-opacity="0.7" text-anchor="middle">- DEVAZI STUDIO -</text>
                <text x="540" y="970" font-size="180" font-weight="400" fill="#f0ebe1" text-anchor="middle" letter-spacing="2">Devazi</text>
                <line x1="470" y1="1010" x2="610" y2="1010" stroke="#c9a55a" stroke-opacity="0.7" stroke-width="0.75"></line>
                <text x="540" y="1060" font-size="14" font-weight="500" fill="#c9a55a" text-anchor="middle" letter-spacing="6">EXPERIENCIAS DIGITAIS DE CASAMENTO</text>
            </svg>
        </div>
        <div class="brand-loader-ring" aria-hidden="true">
            <svg viewBox="0 0 220 220">
                <circle class="brand-loader-ring-track" cx="110" cy="110" r="105"></circle>
                <circle class="brand-loader-ring-arc" cx="110" cy="110" r="105"></circle>
            </svg>
            <span class="brand-loader-ring-letter">D</span>
        </div>
    </div>

    <div class="loading-phase loading-phase--couple" id="loadingPhaseCouple" hidden>
        <div class="loader-center" aria-hidden="true">
            <div class="loader-progress-ring">
                <svg viewBox="0 0 220 220">
                    <circle class="loader-progress-track" cx="110" cy="110" r="105"></circle>
                    <circle class="loader-progress-arc" cx="110" cy="110" r="105"></circle>
                </svg>
            </div>

            <div class="bubble-wrap">
                <div class="bubble-shadow"></div>
                <div class="bubble">
                    <div class="bubble-iridescence"></div>
                    <div class="bubble-highlight"></div>
                    <div class="bubble-highlight-small"></div>
                </div>
                <div class="bubble-content">
                    <span class="bubble-letter" id="loadingInitialA">S</span>
                    <span class="bubble-amp">&amp;</span>
                    <span class="bubble-letter" id="loadingInitialB">D</span>
                </div>
            </div>
        </div>

        <div class="loader-status">
            <span class="loader-status-text">Carregando convite</span>
            <div class="loader-dots" aria-hidden="true">
                <span class="loader-dot"></span>
                <span class="loader-dot"></span>
                <span class="loader-dot"></span>
            </div>
        </div>

        <div class="loader-bar-wrap" aria-hidden="true">
            <div class="loader-bar-track">
                <div class="loader-bar-fill"></div>
            </div>
        </div>

        <div class="loader-date-wrap">
            <div class="loader-date-line"></div>
            <p class="loader-date" id="loadingEventDate">-- . -- . ----</p>
        </div>
    </div>
</div>
`;

/**
 * Inicializa a loading screen:
 * 1. Injeta HTML no body (afterbegin para estar antes de tudo)
 * 2. Carrega site.json para descobrir tema e nomes
 * 3. Carrega arquivo de tema para extrair cores
 * 4. Aplica cores via CSS variables
 * 5. Preenche nomes dos noivos
 */
export async function initLoadingScreen() {
    try {
        document.body.insertAdjacentHTML('afterbegin', LOADING_SCREEN_HTML);
        if (!loadPersistedThemeColors()) {
            applyNeutralLoadingColors();
        }

        const configSource = resolveSiteConfigSource();
        const siteRes = await fetch(configSource.url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });
        if (!siteRes.ok) return;

        const siteConfig = await siteRes.json();
        const initials = extractCoupleInitials(siteConfig?.couple?.names || '');
        const formattedDate = formatEventDate(siteConfig?.event?.date, siteConfig?.event?.displayDate, siteConfig?.event?.heroDate);

        updateCouplePhaseData(initials, formattedDate);

        // So troca para fase do casal quando o nome veio valido (nao placeholder).
        if (!initials.isValid) {
            return;
        }

        switchToCouplePhase();

    } catch (error) {
        console.warn('[LoadingScreen] Erro ao carregar dados dinamicos do loader.', error);
    }
}

/**
 * Aplica as cores do tema ativo na loading screen.
 * Chamada por bootstrap() em script.js logo após applyTheme(),
 * garantindo que as cores estejam aplicadas antes do fade-out.
 *
 * @param {object} theme — objeto de tema resolvido (mesmo passado para applyTheme)
 */
export function applyThemeToLoadingScreen(theme) {
    const colors = theme?.colors ?? {};
    const bg      = colors.background || NEUTRAL_LOADING_COLORS.bg;
    const text     = colors.text       || NEUTRAL_LOADING_COLORS.text;
    const primary  = colors.primary    || NEUTRAL_LOADING_COLORS.primary;

    const root = document.documentElement;
    root.style.setProperty('--ls-bg-color',      bg);
    root.style.setProperty('--ls-text-color',    text);
    root.style.setProperty('--ls-primary-color', primary);

    // Persistir para próximas navegações na mesma aba (sem flash neutro)
    persistThemeColors(bg, text, primary);
}

function switchToCouplePhase() {
    const loadingScreen = document.getElementById('loadingScreen');
    const brandPhase = document.getElementById('loadingPhaseBrand');
    const couplePhase = document.getElementById('loadingPhaseCouple');

    if (!loadingScreen || !brandPhase || !couplePhase) {
        return;
    }

    loadingScreen.classList.add('loading-screen--phase-couple');
    brandPhase.hidden = true;
    couplePhase.hidden = false;
}

function extractCoupleInitials(coupleNames) {
    const name = String(coupleNames || '').trim();
    if (!name) {
        return { first: 'S', second: 'D', isValid: false };
    }

    if (isGenericCoupleName(name)) {
        return { first: 'S', second: 'D', isValid: false };
    }

    const parts = splitCoupleName(name);
    const first = extractInitial(parts[0] || name);
    const second = extractInitial(parts[1] || parts[0] || name);

    return {
        first,
        second,
        isValid: true
    };
}

function splitCoupleName(name) {
    const byConnector = name
        .split(/\s*(?:&|\be\b|\band\b|\/)\s*/iu)
        .map((part) => part.trim())
        .filter(Boolean);

    if (byConnector.length >= 2) {
        return [byConnector[0], byConnector[1]];
    }

    const words = name.split(/\s+/).map((part) => part.trim()).filter(Boolean);
    if (words.length >= 2) {
        return [words[0], words[words.length - 1]];
    }

    return [name, name];
}

function extractInitial(value) {
    const normalized = String(value || '').trim();
    const match = normalized.match(/[A-Za-zÀ-ÿ]/u);

    if (!match) {
        return 'S';
    }

    return match[0].toUpperCase();
}

const GENERIC_COUPLE_NAMES = new Set([
    'noiva & noivo',
    'noivo & noiva',
    'noiva e noivo',
    'noivo e noiva',
    'nome & nome',
    'nome e nome',
    'casal'
]);

function normalizeComparableText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function isGenericCoupleName(value) {
    const normalized = normalizeComparableText(value);
    return GENERIC_COUPLE_NAMES.has(normalized);
}

function formatEventDate(eventDate, displayDate, heroDate) {
    const sourceDate = String(eventDate || '').trim();
    const dateMatch = sourceDate.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${day} . ${month} . ${year}`;
    }

    return String(displayDate || heroDate || '-- . -- . ----').trim();
}

function updateCouplePhaseData(initials, formattedDate) {
    const first = document.getElementById('loadingInitialA');
    const second = document.getElementById('loadingInitialB');
    const eventDate = document.getElementById('loadingEventDate');

    if (first) first.textContent = initials.first;
    if (second) second.textContent = initials.second;
    if (eventDate && formattedDate) eventDate.textContent = formattedDate;
}

/**
 * Salva as cores do tema no sessionStorage.
 * sessionStorage dura apenas enquanto a aba estiver aberta, então
 * cada nova aba começa limpa — sem vazar cores de um casal para outro.
 */
function persistThemeColors(bg, text, primary) {
    try {
        sessionStorage.setItem('ls-theme-colors', JSON.stringify({ bg, text, primary }));
    } catch {
        // sessionStorage indisponível (ex: modo incógnito bloqueado) — silencioso
    }
}

/**
 * Lê cores persistidas do sessionStorage e aplica imediatamente.
 * Retorna true se encontrou e aplicou cores, false caso contrário.
 */
function loadPersistedThemeColors() {
    try {
        const raw = sessionStorage.getItem('ls-theme-colors');
        if (!raw) return false;

        const { bg, text, primary } = JSON.parse(raw);
        if (!bg || !text || !primary) return false;

        const root = document.documentElement;
        root.style.setProperty('--ls-bg-color',      bg);
        root.style.setProperty('--ls-text-color',    text);
        root.style.setProperty('--ls-primary-color', primary);
        return true;
    } catch {
        return false;
    }
}

/**
 * Cores neutras escuras — estado inicial e fallback de erro.
 * Evitam o flash de branco antes do tema ser carregado.
 */
const NEUTRAL_LOADING_COLORS = {
    bg:      '#1a1714',
    text:    '#f0ede8',
    primary: '#c9a84c',
};

function applyNeutralLoadingColors() {
    const root = document.documentElement;
    root.style.setProperty('--ls-bg-color',      NEUTRAL_LOADING_COLORS.bg);
    root.style.setProperty('--ls-text-color',    NEUTRAL_LOADING_COLORS.text);
    root.style.setProperty('--ls-primary-color', NEUTRAL_LOADING_COLORS.primary);
}

/**
 * Gerencia o desaparecimento da loading screen
 * Aguarda:
 * 1. Bootstrap completar
 * 2. Delay mínimo de 1000ms (para percepção do usuário)
 * 3. Fade-out de 600ms
 * 
 * Deve ser chamada ao final do bootstrap em script.js
 */
export let bootstrapComplete = false;

/**
 * Marca bootstrap como completo
 * Chamada por script.js para sincronizar o desaparecimento da loading screen
 */
export function markBootstrapComplete() {
    bootstrapComplete = true;
}

/**
 * Flag que indica quando o conteúdo foi renderizado
 * Usado por páginas extras para indicar que estão prontas
 */
export let contentReady = false;

/**
 * Marca o conteúdo da página como pronto
 * Chamada por páginas extras após renderizar seu conteúdo
 */
export function markContentReady() {
    contentReady = true;
}

export async function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return;

    // Aguarda bootstrap completar (se não tiver completado)
    while (!bootstrapComplete) {
        await new Promise(r => setTimeout(r, 100));
    }

    // Se for uma página extra, aguarda o conteúdo estar pronto
    // Timeout de 5 segundos como failsafe para não ficar travado
    const contentTimeout = new Promise(r => setTimeout(r, 5000));
    const contentCheck = new Promise(r => {
        const checkInterval = setInterval(() => {
            if (contentReady || !document.body.classList.contains('extra-page')) {
                clearInterval(checkInterval);
                r();
            }
        }, 100);
    });
    await Promise.race([contentTimeout, contentCheck]);

    // Espera MAIS 1000ms mesmo que tudo pronto (delay mínimo obrigatório)
    await new Promise(r => setTimeout(r, 1500));

    // Aí sim desaparece com fade-out de 600ms
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        if (loadingScreen.parentNode) {
            loadingScreen.remove();
        }
    }, 600);
}
