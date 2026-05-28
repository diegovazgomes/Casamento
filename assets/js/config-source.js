export const STATIC_SITE_CONFIG_URL = 'assets/config/site.json';
export const DEFAULT_LAYOUT_KEY = 'classic';
export const DEFAULT_THEME_PATH = 'assets/themes/silver-light.json';
export const DEFAULT_LAYOUT_DEFAULTS_PATH = (layoutKey) =>
  `assets/layouts/${layoutKey}/defaults.json`;

const LEGACY_THEME_TO_SHARED_KEY = Object.freeze({
  'classic-gold': 'gold',
  'classic-gold-light': 'gold-light',
  'classic-silver': 'silver',
  'classic-silver-light': 'silver-light',
  'classic-purple': 'purple',
  'classic-blue': 'blue',
  'classic-green-light': 'green-light',
  'black-silver': 'silver',
});

const SHARED_THEME_TO_LEGACY_KEYS = Object.freeze({
  gold: ['classic-gold'],
  'gold-light': ['classic-gold-light'],
  silver: ['classic-silver', 'black-silver'],
  'silver-light': ['classic-silver-light'],
  purple: ['classic-purple'],
  blue: ['classic-blue'],
  'green-light': ['classic-green-light'],
});

function normalizePathname(pathname) {
  if (typeof pathname !== 'string') {
    return '/';
  }

  return pathname.trim() || '/';
}

function getCurrentPathname() {
  if (typeof window !== 'undefined' && window.location?.pathname) {
    return window.location.pathname;
  }

  return '/';
}

function getCurrentUrl() {
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }

  return 'https://example.com/';
}

function extractThemeToken(themeValue) {
  const normalizedValue = String(themeValue || '').trim();
  if (!normalizedValue) {
    return '';
  }

  if (!normalizedValue.includes('/')) {
    return normalizedValue.replace(/\.json$/i, '');
  }

  const match = normalizedValue.match(/\/themes\/([^/]+)\.json$/i);
  if (match) {
    return match[1];
  }

  const parts = normalizedValue.replace(/\\/g, '/').split('/');
  return (parts.pop() || '').replace(/\.json$/i, '');
}

export function getEventSlugFromPath(pathname = getCurrentPathname()) {
  const normalizedPath = normalizePathname(pathname);
  const [firstSegment = ''] = normalizedPath.split('/').filter(Boolean);

  if (!firstSegment) {
    return '';
  }

  if (firstSegment.includes('.')) {
    return '';
  }

  if (firstSegment === 'api' || firstSegment === 'assets') {
    return '';
  }

  return firstSegment;
}

function getEventSlugFromQuery(currentUrl = window.location.href) {
  try {
    const searchParams = new URL(currentUrl).searchParams;
    return searchParams.get('slug') || searchParams.get('event') || '';
  } catch {
    return '';
  }
}

export function normalizeThemeKey(activeTheme) {
  const rawKey = extractThemeToken(activeTheme);
  if (!rawKey) {
    return '';
  }

  return LEGACY_THEME_TO_SHARED_KEY[rawKey] || rawKey;
}

export function getThemeOverrideBucketKeys(activeTheme) {
  const rawKey = extractThemeToken(activeTheme);
  const primaryKey = normalizeThemeKey(activeTheme);

  if (!primaryKey) {
    return [];
  }

  const uniqueKeys = [primaryKey];

  if (rawKey && rawKey !== primaryKey) {
    uniqueKeys.push(rawKey);
  }

  for (const legacyKey of SHARED_THEME_TO_LEGACY_KEYS[primaryKey] || []) {
    if (!uniqueKeys.includes(legacyKey)) {
      uniqueKeys.push(legacyKey);
    }
  }

  return uniqueKeys;
}

export function resolveSiteConfigSource(
  pathname = getCurrentPathname(),
  currentUrl = getCurrentUrl(),
) {
  const slug = getEventSlugFromQuery(currentUrl) || getEventSlugFromPath(pathname);

  if (!slug) {
    return {
      slug: '',
      url: STATIC_SITE_CONFIG_URL,
      usesApi: false,
    };
  }

  return {
    slug,
    url: `/api/event-config?slug=${encodeURIComponent(slug)}`,
    usesApi: true,
  };
}

export function resolveThemePath(activeTheme, layoutKey = DEFAULT_LAYOUT_KEY) {
  void layoutKey;
  const normalizedThemeKey = normalizeThemeKey(activeTheme);

  if (!normalizedThemeKey) {
    return DEFAULT_THEME_PATH;
  }

  return `assets/themes/${normalizedThemeKey}.json`;
}

export function resolveLayoutDefaultsPath(layoutKey = DEFAULT_LAYOUT_KEY) {
  return `assets/layouts/${layoutKey}/defaults.json`;
}
