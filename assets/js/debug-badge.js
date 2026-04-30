/**
 * Debug Badge — visível apenas com ?debug ou ?dev na URL.
 *
 * Mostra: timestamp de load da página, timestamp do fetch da config,
 * tema ativo e indicador FRESH / CACHED (via Performance API).
 *
 * Uso: seusite.com/slug?debug   ou   seusite.com/slug?dev
 */

const DEBUG_PARAMS = ['debug', 'dev'];

function isDebugMode() {
    const params = new URLSearchParams(window.location.search);
    return DEBUG_PARAMS.some(p => params.has(p));
}

function fmt(date) {
    return date.toLocaleTimeString('pt-BR', { hour12: false }) +
        '.' + String(date.getMilliseconds()).padStart(3, '0');
}

function isCached(url) {
    try {
        const entries = performance.getEntriesByName(url, 'resource');
        if (!entries.length) return null;
        const entry = entries[entries.length - 1];
        // transferSize === 0 → served from cache (disk or memory)
        // duration < 10ms também é um sinal forte de cache hit
        return entry.transferSize === 0 || entry.duration < 10;
    } catch {
        return null;
    }
}

function buildBadgeHTML(loadTime) {
    return `
<div id="__debugBadge" style="
    position: fixed;
    bottom: 14px;
    right: 14px;
    z-index: 99999;
    background: rgba(10,10,10,0.88);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    padding: 8px 12px;
    font-family: 'Menlo','Consolas','monospace',monospace;
    font-size: 10px;
    line-height: 1.65;
    color: #e2e2e2;
    max-width: 260px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    user-select: none;
">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
    <span style="color:#9d9dff;font-weight:600;letter-spacing:.04em;">⬡ DEBUG</span>
    <button onclick="document.getElementById('__debugBadge').remove()" style="
        background:none;border:none;cursor:pointer;color:#888;
        font-size:13px;line-height:1;padding:0 0 0 10px;">✕</button>
  </div>
  <div id="__db_load">🕐 load&nbsp;&nbsp;&nbsp;<span style="color:#fff">${loadTime}</span></div>
  <div id="__db_fetch">⏳ config&nbsp;&nbsp;<span style="color:#aaa">aguardando…</span></div>
  <div id="__db_theme">🎨 tema&nbsp;&nbsp;&nbsp;<span style="color:#aaa">—</span></div>
    <div id="__db_commit">🔖 commit&nbsp;<span style="color:#aaa">—</span></div>
  <div id="__db_cache">📡 cache&nbsp;&nbsp;<span style="color:#aaa">—</span></div>
</div>`;
}

function updateBadge({ fetchTime, theme, cached, commit }) {
    const el = id => document.querySelector(`#__debugBadge #${id} span`);

    if (fetchTime !== undefined) {
        const fetchEl = el('__db_fetch');
        if (fetchEl) fetchEl.textContent = fetchTime;
    }
    if (theme !== undefined) {
        const themeEl = el('__db_theme');
        if (themeEl) {
            themeEl.textContent = theme || '(desconhecido)';
            themeEl.style.color = '#c9f';
        }
    }
    if (commit !== undefined) {
        const commitEl = el('__db_commit');
        if (commitEl) {
            const short = String(commit || '').trim();
            if (short) {
                commitEl.textContent = short.slice(0, 8);
                commitEl.style.color = '#8fd3ff';
            } else {
                commitEl.textContent = 'indisponivel';
                commitEl.style.color = '#aaa';
            }
        }
    }
    if (cached !== null && cached !== undefined) {
        const cacheEl = el('__db_cache');
        if (cacheEl) {
            if (cached) {
                cacheEl.textContent = 'CACHED';
                cacheEl.style.color = '#ffd060';
            } else {
                cacheEl.textContent = 'FRESH';
                cacheEl.style.color = '#5dde8a';
            }
        }
    }
}

async function loadCommitInfo() {
    try {
        const response = await fetch('/api/config', { cache: 'no-store' });
        if (!response.ok) {
            updateBadge({ commit: '' });
            return;
        }

        const data = await response.json();
        updateBadge({ commit: data?.commitSha || '' });
    } catch {
        updateBadge({ commit: '' });
    }
}

/**
 * Ponto de entrada. Chame assim que o DOM estiver disponível.
 * A atualização com dados de config/tema é feita via onConfigLoaded().
 */
export function initDebugBadge() {
    if (!isDebugMode()) return;
    const loadTime = fmt(new Date());
    document.body.insertAdjacentHTML('beforeend', buildBadgeHTML(loadTime));
    loadCommitInfo();
}

/**
 * Atualiza o badge com os dados do fetch de config.
 * Chame após o fetch da config completar (em script.js ou bootstrap).
 *
 * @param {object} options
 * @param {string}  options.configUrl  — URL que foi buscada
 * @param {string}  options.theme      — nome do tema ativo (ex: "classic-gold")
 */
export function onConfigLoaded({ configUrl, theme } = {}) {
    if (!isDebugMode()) return;
    const fetchTime = fmt(new Date());
    const cached = configUrl ? isCached(configUrl) : null;
    updateBadge({ fetchTime, theme, cached });
}
