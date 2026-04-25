/**
 * Loading Screen Module
 * 
 * Gerencia a tela de carregamento de forma centralizada:
 * - Injeta HTML da loading screen no body
 * - Carrega cores do tema dinamicamente
 * - Preenche nomes dos noivos
 * - Coordena com o bootstrap principal
 */

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
        <p class="loading-names" id="loadingNames"></p>
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
        // 1. Injetar HTML
        document.body.insertAdjacentHTML('afterbegin', LOADING_SCREEN_HTML);

        // 2. Carregar site.json
        const siteRes = await fetch('assets/config/site.json');
        if (!siteRes.ok) {
            applyFallbackLoadingColors();
            return;
        }
        const siteConfig = await siteRes.json();
        const coupleNames = siteConfig?.couple?.names || 'Siannah & Diego';

        // 3. Descobrir caminho do tema
        let themePath = siteConfig.activeTheme;
        if (!themePath) {
            themePath = 'assets/layouts/classic/themes/classic-silver.json';
        }

        // 4. Carregar arquivo de tema
        const themeRes = await fetch(themePath);
        if (!themeRes.ok) {
            applyFallbackLoadingColors();
            preencherNomes(coupleNames);
            return;
        }
        const theme = await themeRes.json();

        // 5. Extrair cores do tema
        const bgColor = theme?.colors?.background || '#ffffff';
        const textColor = theme?.colors?.text || '#f5f5f5';
        const primaryColor = theme?.colors?.primary || textColor;

        // 6. Aplicar cores via CSS variables
        const root = document.documentElement;
        root.style.setProperty('--ls-bg-color', bgColor);
        root.style.setProperty('--ls-text-color', textColor);
        root.style.setProperty('--ls-primary-color', primaryColor);

        // 7. Preencher nomes dos noivos
        preencherNomes(coupleNames);

    } catch (error) {
        console.warn('[LoadingScreen] Erro ao inicializar, usando fallback.', error);
        applyFallbackLoadingColors();
    }
}

/**
 * Preenche o elemento de nomes com os nomes dos noivos
 * Remove a cor de "Carregando" e deixa discreto
 */
function preencherNomes(coupleNames) {
    const loadingNames = document.getElementById('loadingNames');
    if (loadingNames) {
        loadingNames.textContent = coupleNames;
    }
}

/**
 * Aplica cores padrão se o carregamento do tema falhar
 * Garante que a loading screen sempre apareça com cores aceitáveis
 */
function applyFallbackLoadingColors() {
    const root = document.documentElement;
    root.style.setProperty('--ls-bg-color', '#ffffff');
    root.style.setProperty('--ls-text-color', '#f5f5f5');
    root.style.setProperty('--ls-primary-color', '#f5f5f5');
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
