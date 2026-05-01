/**
 * Loading Screen Module
 * 
 * Gerencia a tela de carregamento de forma centralizada:
 * - Injeta HTML da loading screen no body
 * - Carrega cores do tema dinamicamente
 * - Preenche nomes dos noivos
 * - Coordena com o bootstrap principal
 */

import { resolveSiteConfigSource, resolveThemePath } from './config-source.js';

const LOADING_SCREEN_HTML = `
<div class="loading-screen" id="loadingScreen" aria-hidden="true">
    <div class="loading-backdrop"></div>
    <div class="loading-content">
        <div class="loading-hearts">
            <!-- Heart 1: Text Color (cinza/branco) -->
            <svg class="heart heart-text" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M50,95 C20,75 5,60 5,45 C5,30 15,20 27,20 C35,20 42,25 50,35 C58,25 65,20 73,20 C85,20 95,30 95,45 C95,60 80,75 50,95 Z" fill="currentColor"/>
            </svg>
            <!-- Heart 2: Primary Color (prata/ouro) -->
            <svg class="heart heart-primary" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M50,95 C20,75 5,60 5,45 C5,30 15,20 27,20 C35,20 42,25 50,35 C58,25 65,20 73,20 C85,20 95,30 95,45 C95,60 80,75 50,95 Z" fill="currentColor"/>
            </svg>
        </div>
        <p class="loading-names" id="loadingNames">Carregando experiências…</p>
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
        // 1. Injetar HTML e aplicar cores imediatamente (sem esperar fetch)
        //    Prefere cores persistidas da visita anterior (evita flash neutro).
        document.body.insertAdjacentHTML('afterbegin', LOADING_SCREEN_HTML);
        if (!loadPersistedThemeColors()) {
            applyNeutralLoadingColors();
        }

        // 2. Buscar apenas os nomes do casal — em paralelo com o bootstrap principal
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
        const layoutKey = siteConfig?.activeLayout;
        const themePath = resolveThemePath(siteConfig?.activeTheme, layoutKey);

        try {
            const themeRes = await fetch(themePath, {
                method: 'GET',
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            });

            if (themeRes.ok) {
                const theme = await themeRes.json();
                applyThemeToLoadingScreen(theme);
            } else {
                applyFallbackLoadingColors();
            }
        } catch {
            applyFallbackLoadingColors();
        }

        preencherNomes(siteConfig?.couple?.names || '');

    } catch (error) {
        console.warn('[LoadingScreen] Erro ao buscar nomes, usando fallback.', error);
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
 * Preenche o elemento de nomes com os nomes dos noivos
 * Só atualiza se o nome for real (não genérico e não vazio)
 */
// Valores genéricos que NÃO devem substituir o placeholder de loading
const GENERIC_NAME_FALLBACKS = ['Noiva & Noivo', 'Casal', 'Nome & Nome', ''];

function preencherNomes(coupleNames) {
    const loadingNames = document.getElementById('loadingNames');
    const nome = (coupleNames || '').trim();
    if (loadingNames && nome && !GENERIC_NAME_FALLBACKS.includes(nome)) {
        loadingNames.textContent = nome;
    }
    // Caso contrário, mantém "Carregando experiências…"
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
 * Aplica cores neutras se o carregamento do tema falhar.
 * Garante que a loading screen sempre apareça com cores legíveis.
 */
function applyFallbackLoadingColors() {
    applyNeutralLoadingColors();
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