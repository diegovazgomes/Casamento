export const STATIC_SITE_CONFIG_URL = 'assets/config/site.json';
export const DEFAULT_LAYOUT_KEY = 'classic';
export const DEFAULT_THEME_PATH = 'assets/layouts/classic/themes/classic-silver.json';

function normalizePathname(pathname) {
  if (typeof pathname !== 'string') {
    return '/';
  }

  return pathname.trim() || '/';
}

export function getEventSlugFromPath(pathname = window.location.pathname) {
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

export function resolveSiteConfigSource(
  pathname = window.location.pathname,
  currentUrl = window.location.href,
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
  if (!activeTheme) {
    return DEFAULT_THEME_PATH;
  }

  if (activeTheme.startsWith('assets/')) {
    return activeTheme;
  }

  return `assets/layouts/${layoutKey}/themes/${activeTheme}.json`;
}