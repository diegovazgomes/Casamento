/**
 * Loading Screen Module
 *
 * Gerencia a tela de carregamento em 3 fases:
 *
 * FASE 1 — Primeira visita (sem cache):
 *   Mostra corações animados enquanto o Supabase ainda não respondeu.
 *
 * FASE 2 — Dados chegam (transição):
 *   applyEventDataToLoadingScreen() faz fade-out dos corações,
 *   fade-in da bolha iridescente com as iniciais do casal e persiste
 *   ls_data_ready + ls_initials no sessionStorage.
 *
 * FASE 3 — Navegações seguintes (com cache):
 *   initLoadingScreen() detecta ls_data_ready=1 no sessionStorage e
 *   monta o HTML já com a bolha visível — sem mostrar os corações.
 */

import { resolveSiteConfigSource, resolveThemePath } from './config-source.js';

// ---------------------------------------------------------------------------
// Helpers de sessionStorage (silenciosos em modo incógnito bloqueado)
// ---------------------------------------------------------------------------

function ssGet(key) {
    try { return sessionStorage.getItem(key); } catch { return null; }
}

function ssSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* silencioso */ }
}

// ---------------------------------------------------------------------------
// Extração de iniciais
// "Siannah & Diego" → "S & D"
// ---------------------------------------------------------------------------

function extractInitials(names) {
    if (!names || typeof names !== 'string') return '';
    const parts = names.split('&').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
    return parts.map(p => p[0]?.toUpperCase() || '').join(' & ');
}

// ---------------------------------------------------------------------------
// HTML da loading screen
//
// showBubble = false → Fase 1: coração visível, bolha ausente do DOM
// showBubble = true  → Fase 3: bolha visível imediatamente, coração nunca injetado
//
// Estratégia: quando fase 3, o coração NÃO é inserido no DOM (não apenas oculto).
// Isso elimina qualquer risco de flash ou override de CSS.
// ---------------------------------------------------------------------------

const HEART_HTML = `
        <!-- Fase 1: corações (só primeira visita) -->
        <div id="lsHeart" class="ls-heart-container">
            <div class="loading-hearts">
                <svg class="heart heart-text" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M50,95 C20,75 5,60 5,45 C5,30 15,20 27,20 C35,20 42,25 50,35 C58,25 65,20 73,20 C85,20 95,30 95,45 C95,60 80,75 50,95 Z" fill="currentColor"/>
                </svg>
                <svg class="heart heart-primary" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M50,95 C20,75 5,60 5,45 C5,30 15,20 27,20 C35,20 42,25 50,35 C58,25 65,20 73,20 C85,20 95,30 95,45 C95,60 80,75 50,95 Z" fill="currentColor"/>
                </svg>
            </div>
            <p class="loading-names" id="loadingNames">Carregando experiências…</p>
        </div>`;

function buildLoadingHTML(showBubble, initials) {
    // Fase 3: bolha pequena visível, coração fora do DOM
    // Fase 1: coração visível, bolha oculta (display:none)
    const heartSection  = showBubble ? '' : HEART_HTML;
    const bubbleStyle   = showBubble ? 'display:flex;opacity:1' : 'display:none;opacity:0';
    // ls-bubble--small reduz para 80% quando aparece direto (sem a transição do coração)
    const bubbleClass   = showBubble ? 'ls-bubble ls-bubble--small' : 'ls-bubble';

    return `
<div class="loading-screen" id="loadingScreen" aria-hidden="true">
    <div class="loading-backdrop"></div>
    <div class="loading-content">
${heartSection}
        <!-- Fase 2+: bolha iridescente -->
        <div id="lsBubble" class="${bubbleClass}" style="${bubbleStyle}" role="img" aria-label="Iniciais do casal">
            <div class="ls-bubble-glass">
                <span class="ls-bubble-initials" id="lsBubbleInitials">${initials}</span>
            </div>
        </div>

    </div>
</div>`;
}

// ---------------------------------------------------------------------------
// Injetar Google Fonts no <head> (idempotente)
// ---------------------------------------------------------------------------

function ensureGreatVibesFont() {
    if (document.querySelector('link[href*="Great+Vibes"]')) return;
    const pre = document.createElement('link');
    pre.rel = 'preconnect';
    pre.href = 'https://fonts.googleapis.com';
    document.head.prepend(pre);

    const lnk = document.createElement('link');
    lnk.rel = 'stylesheet';
    lnk.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
    document.head.appendChild(lnk);
}

// ---------------------------------------------------------------------------
// initLoadingScreen — chamada imediatamente, antes do bootstrap
// ---------------------------------------------------------------------------

export async function initLoadingScreen() {
    ensureGreatVibesFont();

    const dataReady     = ssGet('ls_data_ready') === '1';
    const savedInitials = ssGet('ls_initials') || '';

    // Monta HTML na fase correta
    document.body.insertAdjacentHTML('afterbegin', buildLoadingHTML(dataReady, savedInitials));

    // Aplica cores: prefere cache → fallback neutro
    if (!loadPersistedThemeColors()) {
        applyNeutralLoadingColors();
    }
}

// ---------------------------------------------------------------------------
// applyEventDataToLoadingScreen — chamada por script.js quando Supabase responde
// ---------------------------------------------------------------------------

export function applyEventDataToLoadingScreen({ names = '', date = '' } = {}) {
    const initials = extractInitials(names);

    // Persistir para próximas navegações
    ssSet('ls_data_ready', '1');
    if (initials) ssSet('ls_initials', initials);

    const lsHeart          = document.getElementById('lsHeart');
    const lsBubble         = document.getElementById('lsBubble');
    const lsBubbleInitials = document.getElementById('lsBubbleInitials');

    // Atualizar iniciais (sempre, mesmo que já visível na fase 3)
    if (lsBubbleInitials && initials) {
        lsBubbleInitials.textContent = initials;
    }

    // Fase 3: bolha já visível, nada a animar
    if (!lsHeart || lsHeart.style.display === 'none') return;

    // Fase 2: transição coração → bolha
    lsHeart.style.transition = 'opacity 0.45s ease';
    lsHeart.style.opacity    = '0';

    setTimeout(() => {
        lsHeart.style.display = 'none';

        if (lsBubble) {
            lsBubble.style.display  = 'flex';
            lsBubble.style.opacity  = '0';
            // Forçar reflow para ativar a transition
            void lsBubble.offsetWidth;
            lsBubble.style.transition = 'opacity 0.5s ease';
            lsBubble.style.opacity    = '1';
        }
    }, 450);
}

// ---------------------------------------------------------------------------
// applyThemeToLoadingScreen — aplica cores do tema ativo
// Chamada por bootstrap() em script.js logo após applyTheme()
// ---------------------------------------------------------------------------

export function applyThemeToLoadingScreen(theme) {
    const colors  = theme?.colors ?? {};
    const bg      = colors.background || NEUTRAL_LOADING_COLORS.bg;
    const text     = colors.text       || NEUTRAL_LOADING_COLORS.text;
    const primary  = colors.primary    || NEUTRAL_LOADING_COLORS.primary;

    const root = document.documentElement;
    root.style.setProperty('--ls-bg-color',      bg);
    root.style.setProperty('--ls-text-color',    text);
    root.style.setProperty('--ls-primary-color', primary);

    persistThemeColors(bg, text, primary);
}

// ---------------------------------------------------------------------------
// Persistência de cores do tema no sessionStorage
// ---------------------------------------------------------------------------

function persistThemeColors(bg, text, primary) {
    try {
        sessionStorage.setItem('ls-theme-colors', JSON.stringify({ bg, text, primary }));
    } catch { /* silencioso */ }
}

function loadPersistedThemeColors() {
    try {
        const raw = sessionStorage.getItem('ls-theme-colors');
        if (!raw) return false;
        const { bg, text, primary } = JSON.parse(raw);
        if (!bg || !text || !primary) return false;
        const root = document.docume