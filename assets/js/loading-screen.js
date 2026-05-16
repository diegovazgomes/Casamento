/**
 * Loading Screen Module
 *
 * Gerencia a tela de carregamento em duas fases:
 * - Fase 1: identidade Devasi antes de carregar config
 * - Fase 2: visual do convite com iniciais/data dinamicas
 */

import { resolveSiteConfigSource } from './config-source.js';

// Chave sessionStorage: apenas o FLAG de que já foi carregado antes.
// Nunca persiste os valores em si para evitar dados stale.
const LOADING_DATA_READY_KEY = 'ls_data_ready';

// Timestamp do início da loading screen — usado para garantir mínimo de 4s
let loadingStartTime = 0;

/**
 * Gera o HTML da loading screen.
 *
 * @param {{ first: string, second: string, date: string }|null} prefill
 * @param {{ showCouplePhase?: boolean }} options
 *   Dados do casal lidos sincronamente do sessionStorage no <head>.
 *   Quando fornecidos, pré-preenche o texto das iniciais e data antes do
 *   módulo ES executar — o CSS cuida de revelar com fade (animation-delay:1.5s).
 *   Quando null (primeira visita), usa placeholders "-" e "--. --. ----".
 */
function buildLoadingHTML(prefill = null, options = {}) {
    const showCouplePhase = options.showCouplePhase === true;
    const initialA = prefill?.first  || '';
    const initialB = prefill?.second || '';
    const dateText = normalizeLoadingDateText(prefill?.date || '');

    return `
<div class="loading-screen${showCouplePhase ? ' loading-screen--phase-couple' : ''}" id="loadingScreen" aria-hidden="true">
    <div class="loading-backdrop"></div>
    <div class="loading-phase loading-phase--brand" id="loadingPhaseBrand" role="status" aria-live="polite" aria-label="Carregando"${showCouplePhase ? ' hidden' : ''}>
        <div class="brand-phase-center">
            <p class="brand-studio-tag">Stúdio</p>
            <div class="brand-name-frame">
                <svg class="brand-frame-svg" viewBox="0 0 340 108" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect class="brand-frame-track" x="2" y="2" width="336" height="104" rx="14" ry="14"/>
                    <rect class="brand-frame-beam"  x="2" y="2" width="336" height="104" rx="14" ry="14"/>
                </svg>
                <span class="brand-name-word">Devazi</span>
            </div>
            <p class="brand-tagline">Experiências digitais</p>
            <button class="ls-brand-btn" id="loadingBrandBtn" type="button" hidden>Abrir convite</button>
        </div>
    </div>

    <div class="loading-phase loading-phase--card" id="loadingPhaseCard" hidden>
        <div class="ls-card">
            <p class="ls-card__names" id="loadingCardNames"></p>
            <p class="ls-card__date" id="loadingCardDate"></p>
            <button class="ls-card__btn" id="loadingCardBtn" type="button">Abrir convite</button>
        </div>
    </div>

    <div class="loading-phase loading-phase--couple" id="loadingPhaseCouple"${showCouplePhase ? '' : ' hidden'}>
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
                    <div class="bubble-monogram">
                        <span class="bubble-letter" id="loadingInitialA">${initialA}</span>
                        <span class="bubble-amp">&amp;</span>
                        <span class="bubble-letter" id="loadingInitialB">${initialB}</span>
                    </div>
                    <p class="loader-date loader-date--inside-bubble" id="loadingEventDate">${dateText}</p>
                </div>
            </div>
        </div>
    </div>
</div>
`;
}

/**
 * Inicializa a loading screen.
 *
 * Fase brand → fase couple é decidida pelo flag sessionStorage 'ls_data_ready':
 * - Ausente (primeira visita nesta sessão): mostra brand (Devazi).
 * - Presente (já carregou antes): mostra couple direto, dados em opacity:0.
 *
 * Os valores (iniciais e data) são sempre preenchidos por applyEventDataToLoadingScreen(),
 * que recebe dados frescos do Supabase e os revela com fade de 150ms.
 */
export function initLoadingScreen() {
    loadingStartTime = Date.now();

    try {
        if (!loadPersistedThemeColors()) {
            applyNeutralLoadingColors();
        }

        // Guard: o script síncrono no <head> pode ter injetado o HTML antes
        // deste módulo executar. Nesse caso, não duplicar.
        if (document.getElementById('loadingScreen')) {
            return;
        }

        // Ler dados pré-carregados pelo script síncrono no <head>.
        // Quando presentes, buildLoadingHTML injeta os valores já visíveis (opacity:1).
        const prefill = (window.__LS_COUPLE_DATA__ && window.__LS_COUPLE_DATA__.first)
            ? window.__LS_COUPLE_DATA__
            : null;

        const dataReady = ssGet(LOADING_DATA_READY_KEY) === '1';
        document.body.insertAdjacentHTML('afterbegin', buildLoadingHTML(prefill, {
            showCouplePhase: dataReady,
        }));
    } catch (error) {
        console.warn('[LoadingScreen] Erro ao inicializar.', error);
    }
}

/**
 * Preenche os dados do casal na fase couple e os revela com fade suave.
 * Deve ser chamada por script.js logo após o config do Supabase ser resolvido.
 * Salva apenas o FLAG 'ls_data_ready' — nunca os valores (evita stale data).
 *
 * @param {{ names: string, date: string }} param
 *   names — couple.names do config (ex: "Siannah & Diego")
 *   date  — event.date ISO (ex: "2026-09-07") — usado para formatar a data
 */
export function applyEventDataToLoadingScreen({ names = '', date = '' } = {}) {
    // Verificar se é primeira visita ANTES de qualquer alteração visual.
    // Na primeira visita o Devazi deve permanecer visível até hideLoadingScreen().
    const isFirstVisit = ssGet(LOADING_DATA_READY_KEY) !== '1';

    const initials = extractCoupleInitials(names);
    const formattedDate = formatEventDate(date, '', '');

    // Preencher iniciais se válidas (necessário para o prefill na próxima visita)
    if (initials.isValid) {
        const elA = document.getElementById('loadingInitialA');
        const elB = document.getElementById('loadingInitialB');
        if (elA) elA.textContent = initials.first;
        if (elB) elB.textContent = initials.second;
    }

    // Preencher data (necessário para o prefill na próxima visita)
    const elDate = document.getElementById('loadingEventDate');
    if (elDate && formattedDate && formattedDate !== '--.--.----') {
        elDate.textContent = formattedDate;
    }

    // Na primeira visita: NÃO trocar de fase. Devazi permanece ativo e some
    // diretamente para o conteúdo via hideLoadingScreen(). A fase couple só
    // aparece em visitas subsequentes (quando ls_data_ready já estava '1').
    if (!isFirstVisit) {
        const couplePhase = document.getElementById('loadingPhaseCouple');
        if (couplePhase?.hidden) {
            switchToCouplePhase();
        }
    }

    // Opacity é gerenciada pelo CSS (animation-delay: 2s em animations.css).
    // Não manipular opacity aqui — evita conflito com a animação CSS.

    // Persistir dados do casal para leitura síncrona no <head> na próxima visita.
    // sessionStorage é descartado ao fechar o browser — sem risco de stale data entre eventos.
    try {
        sessionStorage.setItem('ls_couple', JSON.stringify({
            first:  initials.isValid ? initials.first  : '',
            second: initials.isValid ? initials.second : '',
            date:   (formattedDate && formattedDate !== '--.--.----') ? formattedDate : '',
        }));
    } catch { /* silencioso */ }

    ssSet(LOADING_DATA_READY_KEY, '1');
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
        return { first: '-', second: '-', isValid: false };
    }

    if (isGenericCoupleName(name)) {
        return { first: '-', second: '-', isValid: false };
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
        return '-';
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
        return `${day}.${month}.${year}`;
    }

    return normalizeLoadingDateText(String(displayDate || heroDate || '--.--.----').trim());
}

function normalizeLoadingDateText(value) {
    return String(value || '')
        .replace(/\s*\.\s*/g, '.')
        .trim();
}

/** Helpers silenciosos para sessionStorage */
function ssGet(key) {
    try { return sessionStorage.getItem(key) || ''; } catch { return ''; }
}
function ssSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* silencioso */ }
}

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

/**
 * Ativa o botão "Abrir convite" na fase brand (plano free).
 * @param {() => void} onOpen — callback disparado ao clicar
 */
export function showFreeInviteButton(onOpen) {
    const btn = document.getElementById('loadingBrandBtn');
    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener('click', () => onOpen(), { once: true });
}

/**
 * Ativa a experiência de entrada premium:
 * 1. Detecta se o tema é claro e anima o backdrop para a cor de fundo.
 * 2. Troca para o card com nomes e botão "Abrir convite".
 *
 * @param {{ coupleNames: string, eventDate: string, onOpen: () => void }} options
 */
export function showPremiumInviteCard({ coupleNames = '', eventDate = '', onOpen }) {
    const backdrop = document.querySelector('.loading-backdrop');
    const brandPhase = document.getElementById('loadingPhaseBrand');
    const couplePhase = document.getElementById('loadingPhaseCouple');
    const cardPhase = document.getElementById('loadingPhaseCard');
    const cardNames = document.getElementById('loadingCardNames');
    const cardDate = document.getElementById('loadingCardDate');
    const cardBtn = document.getElementById('loadingCardBtn');

    if (!cardPhase) return;

    // Preencher nomes e data
    if (cardNames) cardNames.textContent = coupleNames || '';
    if (cardDate && eventDate) {
        const match = String(eventDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) cardDate.textContent = `${match[3]}.${match[2]}.${match[1]}`;
    }

    // Detectar luminância do tema para decidir transição de cor
    const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-background').trim()
        || getComputedStyle(document.documentElement)
        .getPropertyValue('--ls-bg-color').trim();

    const isLightTheme = bgColor ? isLightColor(bgColor) : false;

    if (isLightTheme && backdrop) {
        backdrop.style.backgroundColor = bgColor;
    }

    // Esconder fases anteriores e mostrar card
    if (brandPhase) brandPhase.hidden = true;
    if (couplePhase) couplePhase.hidden = true;
    cardPhase.hidden = false;

    // Conectar botão
    if (cardBtn) {
        cardBtn.addEventListener('click', () => onOpen(), { once: true });
    }
}

function isLightColor(hex) {
    try {
        const clean = hex.replace('#', '');
        if (clean.length < 6) return false;
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
    } catch {
        return false;
    }
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

    // Garantir mínimo de 4.6s desde o início da loading screen.
    // 1.6s fade-in textos + 3s mínimo do retângulo animado.
    const MIN_DURATION = 4600;
    const elapsed = Date.now() - loadingStartTime;
    const remaining = Math.max(0, MIN_DURATION - elapsed);
    await new Promise(r => setTimeout(r, remaining));

    // Fade-out de 1.2s
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        if (loadingScreen.parentNode) {
            document.documentElement.classList.remove('ls-pending');
            loadingScreen.remove();
        }
    }, 1200);
}
