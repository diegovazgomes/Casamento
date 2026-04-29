export const STATIC_SITE_CONFIG_URL = 'assets/config/site.json';
export const DEFAULT_LAYOUT_KEY = 'classic';
export const DEFAULT_THEME_PATH = 'assets/layouts/classic/themes/classic-silver.json';
const PLACEHOLDER_EVENT_SLUGS = new Set(['event-slug', 'wedding-event', 'default-event', 'demo-event']);

function normalizePathname(pathname) {
  if (typeof pathname !== 'string') {
    return '/';
  }

  return pathname.trim() || '/';
}

function normalizeSlug(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

export function isUsableEventSlug(value) {
  const slug = normalizeSlug(value);

  if (!slug) {
    return false;
  }

  if (slug.includes('.') || slug.includes('/')) {
    return false;
  }

  if (slug === 'api' || slug === 'assets') {
    return false;
  }

  return !PLACEHOLDER_EVENT_SLUGS.has(slug);
}

export function getEventSlugFromSearch(search = window.location.search) {
  try {
    const params = new URLSearchParams(search || '');
    const slug = params.get('slug') || params.get('event') || '';
    return isUsableEventSlug(slug) ? slug.trim() : '';
  } catch {
    return '';
  }
}

export function getEventSlugFromPath(pathname = window.location.pathname) {
  const normalizedPath = normalizePathname(pathname);
  const [firstSegment = ''] = normalizedPath.split('/').filter(Boolean);

  if (!isUsableEventSlug(firstSegment)) {
    return '';
  }

  return firstSegment;
}

export function resolveSiteConfigSource(pathname = window.location.pathname, search = window.location.search) {
  const slug = getEventSlugFromPath(pathname) || getEventSlugFromSearch(search);

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
  if (!activeTheme) {
    return DEFAULT_THEME_PATH;
  }

  if (activeTheme.startsWith('assets/')) {
    return activeTheme;
  }

  return `assets/layouts/${layoutKey}/themes/${activeTheme}.json`;
}