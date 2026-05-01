/**
 * Loading Screen Module
 *
 * Gerencia a tela de carregamento de forma centralizada:
 * - Injeta HTML da loading screen no body
 * - Carrega cores do tema dinamicamente
 * - Preenche nomes e data dos noivos (fase 2)
 * - Coordena com o bootstrap principal
 */

import { resolveSiteConfigSource, resolveThemePath } from './config-source.js';

const LOADING_SCREEN_HTML = `
<div class="loading-screen" id="loadingScreen" aria-hidden="true">
  <div class="loading-backdrop"></div>
  <div class="loading-content">
    <!-- Logo/marca — placeholder com coração (será substituído por SVG) -->
    <div class="ls-logo">
      <span class="ls-logo-icon">♥</span>
    </div>
    <!-- Linha decorativa — aparece 0.4s depois do logo -->
    <div class="ls-divider">
      <span class="ls-divider-line"></span>
      <span class="ls-divider-dot">◆</span>
      <span class="ls-divider-line"></span>
    </div>
    <!-- Dados do casal — hidden até chegarem -->
    <div class="ls-couple" id="lsCouple" style="opacity:0">
      <p class="ls-couple-names" id="lsCoupleNames"></p>
      <p class="ls-couple-date" id="lsCoupleDate"></p>
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
 * 5. Preenche nomes e data dos noivos (fase 2)
 */
export async function initLoadingScreen() {
    try {
        // 1. Injetar HTML e aplicar cores imediatamente (sem esperar fetch)
        //    Prefere cores persistidas da visita anterior (evita flash neutro).
        document.body.insertAdjacentHTML('afterbegin', LOADING_SCREEN_HTML);
        if (!loadPersistedThemeColors()) {
            applyNeutralLoadingColors();
        }

        // 2. Buscar dados do casal — em paralelo com o bootstrap principal
        //    As cores do tema são aplicadas por bootstrap() via applyThemeToLoadingScreen()
        //    assim que o tema real for carregado, garantindo timing correto.
        const configSource = resolveSiteConfigSource();
        const siteRes = await fetch(configSource.url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store'
        });
        if (!siteRes.ok) return;

        const siteConfig = await siteRes.json();
        preencherNomes(siteConfig);

    } catch (error) {
        console.warn('[LoadingScreen] Erro ao buscar dados do casal, usando fallback.', error);
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
 * Preenche os elementos de nomes e data com os dados do casal.
 * Exibe o bloco .ls-couple apenas quando os dados chegarem.
 *
 * @param {object} config — objeto site.json completo
 */
const GENERIC_NAME_FALLBACKS = ['Noiva & Noivo', 'Casal', 'Nome & Nome', ''];

function preencherNomes(config) {
    const coupleEl = document.getElementById('lsCouple');
    const namesEl  = document.getElementById('lsCoupleNames');
    const dateEl   = document.getElementById('lsCoupleDate');

    if (!coupleEl || !namesEl || !dateEl) return;

    const nome = (config?.couple?.names || '').trim();
    const data = (config?.event?.heroDate || config?.event?.detailDate || '').trim();

    // Preenche apenas valores não-genéricos
    if (nome && !GENERIC_NAME_FALLBACKS.includes(nome)) {
        namesEl.textContent = nome;
    }
    if (data) {
        dateEl.textContent = data;
    }

    // Revela o bloco se tiver pelo menos o nome
    if (nome && !GENERIC_NAME_FALLBACKS.includes(nome)) {
        coupleEl.style.opacity = '1';
    }
}

/**
 * Cores neutras escuras — estado inicial e fallback de erro.
 * Evitam o flash de branco antes do tema ser carregado.
 */
const NEUTRAL_LOADING_COLORS = {
    bg:      '#1a1714',   // escuro neutro (compatível com qualquer tema)
    text:    '#f0ede8',   // off-white quente
    primary: '#c9a84c',   // dourado sutil
};

function applyNeutralLoadingColors() {
    const root = document.documentElement;
    root.style.setProperty('--ls-bg-color',      NEUTRAL_LOADING_COLORS.bg);
    root.style.setProperty('--ls-text-color',    NEUTRAL_LOADING_COLORS.text);
    root.style.setProperty('--ls-primary-color', NEUTRAL_LOADING_COLORS.primary);
}

/**
 * Gerencia o desaparecimento da loading screen.
 * Aguarda:
 * 1. Bootstrap completar
 * 2. Delay mínimo de 1500ms (para percepção do usuário)
 * 3. Fade-out de 700ms
 *
 * Deve ser chamada ao final do bootstrap em script.js
 */
export let bootstrapComplete = false;

/**
 * Marca bootstrap como completo.
 * Chamada por script.js para sincronizar o desaparecimento da loading screen.
 */
export function markBootstrapComplete() {
    bootstrapComplete = true;
}

/**
 * Flag que indica quando o conteúdo foi renderizado.
 * Usado por páginas extras para indicar que estão prontas.
 */
export let contentReady = false;

/**
 * Marca o conteúdo da página como pronto.
 * Chamada por páginas extras após renderizar seu conteúdo.
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

    // Espera MAIS 1500ms mesmo que tudo pronto (delay mínimo obrigatório)
    await new Promise(r => setTimeout(r, 1500));

    // Desaparece com fade-out de 700ms
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        if (loadingScreen.parentNode) {
            loadingScreen.remove();
        }
    }, 700);
}
