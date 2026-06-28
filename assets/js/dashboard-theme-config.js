import { cloneDeep, mergeDeep } from './utils.js';
import { getThemeOverrideBucketKeys, resolveThemePath } from './config-source.js';

const SITE_CONFIG_URL = 'assets/config/site.json';
const TYPOGRAPHY_CONFIG_URL = 'assets/config/typography.json';
const DEFAULT_THEME_URL = 'assets/config/defaults/theme.json';
const DEFAULT_SITE_CONTENT_URL = 'assets/config/defaults/site.json';
const ACTIVE_LAYOUT_KEY = 'classic';

const MINIMAL_DEFAULT_THEME = {
  colors: {},
  typography: { fonts: {}, sizes: {} },
  spacing: {},
  layout: {},
  components: {},
  radius: {},
  effects: {},
  animation: {},
  countdown: { format: 'two-digits', updateInterval: 1000 },
  responsive: {},
};

const MINIMAL_DEFAULT_SITE_CONTENT = {
  activeLayout: ACTIVE_LAYOUT_KEY,
  couple: {},
  event: {},
  texts: {},
  gift: {},
  media: { tracks: { main: {}, gift: {} } },
  whatsapp: { messages: {}, feedback: {} },
  pages: {},
  rsvp: { eventId: 'wedding-event', supabaseEnabled: false },
};

async function fetchJson(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

async function loadDefaults() {
  const [themeDefaults, siteDefaults] = await Promise.all([
    fetchJson(DEFAULT_THEME_URL).catch(() => cloneDeep(MINIMAL_DEFAULT_THEME)),
    fetchJson(DEFAULT_SITE_CONTENT_URL).catch(() => cloneDeep(MINIMAL_DEFAULT_SITE_CONTENT)),
  ]);

  return {
    themeDefaults,
    siteDefaults,
  };
}

async function loadConfig(defaults) {
  try {
    const siteConfig = await fetchJson(SITE_CONFIG_URL);
    return mergeDeep(defaults, siteConfig);
  } catch (error) {
    console.warn('[dashboard-theme] Falha ao carregar site.json. Usando defaults.', error);
    return cloneDeep(defaults);
  }
}

async function loadTheme(themePath, defaults) {
  try {
    const themeConfig = await fetchJson(themePath);
    return mergeDeep(defaults, themeConfig);
  } catch (error) {
    console.warn(`[dashboard-theme] Falha ao carregar ${themePath}. Usando defaults.`, error);
    return cloneDeep(defaults);
  }
}

async function loadTypographyConfig() {
  try {
    return await fetchJson(TYPOGRAPHY_CONFIG_URL);
  } catch (error) {
    console.warn('[dashboard-theme] Falha ao carregar typography.json. Usando tipografia do tema.', error);
    return { typography: { families: {} } };
  }
}

function mergeThemeWithGlobalTypography(theme, typographyConfig) {
  const mergedTheme = cloneDeep(theme);
  const globalFamilies = typographyConfig?.typography?.families ?? {};
  const themeFamilies = mergedTheme.typography?.families ?? {};

  mergedTheme.typography = mergedTheme.typography ?? {};
  mergedTheme.typography.families = {
    ...globalFamilies,
    ...themeFamilies,
  };

  return mergedTheme;
}

function getThemeOverrideKey(themePath) {
  return getThemeOverrideBucketKeys(themePath)[0] || '';
}

function getThemeOverridesForActiveTheme(siteConfig, activeThemePath) {
  const byTheme = siteConfig?.themeOverridesByTheme;
  for (const themeKey of getThemeOverrideBucketKeys(activeThemePath)) {
    const scoped = byTheme?.[themeKey];
    if (scoped && typeof scoped === 'object') {
      return scoped;
    }
  }

  const legacy = siteConfig?.themeOverrides;
  if (legacy && typeof legacy === 'object') {
    return legacy;
  }

  return null;
}

function applySiteThemeOverrides(theme, siteConfig, activeThemePath) {
  const overrides = getThemeOverridesForActiveTheme(siteConfig, activeThemePath);
  if (!overrides) {
    return theme;
  }

  return mergeDeep(theme, overrides);
}

async function loadLayoutDefaults(layoutKey, themeDefaults) {
  const path = `assets/layouts/${layoutKey}/defaults.json`;
  try {
    const layoutDefaults = await fetchJson(path);
    return mergeDeep(cloneDeep(themeDefaults), layoutDefaults);
  } catch {
    return cloneDeep(themeDefaults);
  }
}

function resolveTheme(theme) {
  if (window.matchMedia('(max-width: 767px)').matches && theme.responsive?.mobile) {
    return mergeDeep(theme, theme.responsive.mobile);
  }

  return theme;
}

export async function loadDashboardThemeConfig() {
  const { themeDefaults, siteDefaults } = await loadDefaults();
  const config = await loadConfig(siteDefaults);
  const layoutKey = config.activeLayout || ACTIVE_LAYOUT_KEY;
  const themePath = resolveThemePath(config.activeTheme, layoutKey) || 'assets/themes/silver-light.json';
  const layoutBase = await loadLayoutDefaults(layoutKey, themeDefaults);
  const [theme, typographyConfig] = await Promise.all([
    loadTheme(themePath, layoutBase),
    loadTypographyConfig(),
  ]);

  const themeWithTypography = mergeThemeWithGlobalTypography(theme, typographyConfig);
  const themeWithOverrides = applySiteThemeOverrides(themeWithTypography, config, themePath);

  return {
    config,
    theme: resolveTheme(themeWithOverrides),
    themePath,
    layoutKey,
  };
}
