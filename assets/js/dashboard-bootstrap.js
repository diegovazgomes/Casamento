import { loadDashboardThemeConfig } from './dashboard-theme-config.js';
import {
  initLoadingScreen,
  hideLoadingScreen,
  markBootstrapComplete,
  markContentReady,
} from './loading-screen.js';
import { initDebugBadge, onConfigLoaded } from './debug-badge.js';

window.__DASHBOARD_BOOTSTRAP_PROMISE__ = (async function loadTheme() {
  try {
    await initLoadingScreen();
    initDebugBadge();

    window.__ON_DASHBOARD_READY__ = async () => {
      markBootstrapComplete();
      markContentReady();
      await hideLoadingScreen();
    };

    window.addEventListener('dashboard:ready', window.__ON_DASHBOARD_READY__, { once: true });

    if (window.__DASHBOARD_READY__ === true) {
      await window.__ON_DASHBOARD_READY__();
    }

    const { config: site, theme, themePath } = await loadDashboardThemeConfig();

    const colors = theme.colors || {};
    const root = document.documentElement;

    const map = {
      '--bg': colors.background,
      '--surface': colors.surface,
      '--surface-2': colors.surface || colors.background,
      '--primary': colors.primary,
      '--primary-soft': colors.primarySoft || colors.primary,
      '--text': colors.text,
      '--text-soft': colors.textSoft || colors.text,
      '--text-dim': colors.textDim || colors.textMuted,
      '--text-faint': colors.textFaint || colors.textDim,
      '--border': colors.border,
      '--border-strong': colors.borderStrong || colors.border,
      '--primary-glow': colors.primaryGlow,
    };

    Object.entries(map).forEach(([key, value]) => {
      if (value) root.style.setProperty(key, value);
    });

    const coupleNames = site.couple?.names || 'Casal';
    const heroDate = site.event?.heroDate || site.event?.displayDate || '';

    const sidebarCouple = document.getElementById('sidebarCouple');
    const sidebarDate = document.getElementById('sidebarDate');

    if (sidebarCouple) sidebarCouple.textContent = coupleNames;
    if (sidebarDate) sidebarDate.textContent = heroDate;

    window.__SITE_CONFIG__ = site;
    window.__DASHBOARD_THEME__ = theme;
    window.dispatchEvent(new CustomEvent('dashboard:config-ready', {
      detail: { config: site, theme, themePath }
    }));

    onConfigLoaded({ configUrl: themePath, theme: theme.meta?.name || site.activeTheme || 'classic-gold' });

    return { config: site, theme, themePath };
  } catch (err) {
    console.warn('[dashboard] erro carregando tema:', err.message, '- usando padrão');
    return null;
  }
})();
