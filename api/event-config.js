import {
  applyPixQrToGiftConfig,
  applyGalleryToHistoriaConfig,
  buildEventConfigResponse,
  resolveEventGalleryFromStorage,
  resolveEventPixQrFromStorage,
} from './_lib/event-config.js';
import { createSupabaseServerClient } from './_lib/supabase-server.js';

const CACHE_CONTROL_HEADER = 'no-store, no-cache, must-revalidate';
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 60;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_SAME_SLUG_GRACE_MS = 5_000;
const EVENT_SELECT = [
  'id',
  'slug',
  'couple_names',
  'bride_name',
  'groom_name',
  'event_date',
  'event_time',
  'venue_name',
  'venue_address',
  'venue_maps_link',
  'active_theme',
  'active_layout',
  'config',
  'event_gifts(id,type,enabled,sort_order,config)',
].join(',');

const RESERVED_SLUGS = new Set([
  'api',
  'assets',
  'auth',
  'dashboard',
  'docs',
  'tests',
  'index',
  'landing',
  'signup',
  'confirm',
  'forgot-password',
  'reset-password',
  'privacy',
  'terms',
  'editor',
  'font-preview',
  'historia',
  'faq',
  'hospedagem',
  'mensagem',
  'musica',
  'presente',
]);

const requestsByIp = new Map();
const lastCheckByIpAndSlug = new Map();

function normalizeSlug(rawSlug) {
  if (Array.isArray(rawSlug)) {
    return normalizeSlug(rawSlug[0]);
  }

  if (typeof rawSlug !== 'string') {
    return '';
  }

  return rawSlug.trim();
}

function setJsonHeaders(res) {
  res.setHeader('Content-Type', 'application/json');
}

function getOrigin(req) {
  const protocol = req?.headers?.['x-forwarded-proto'] || 'https';
  const host = req?.headers?.host || 'localhost:3000';
  return `${protocol}://${host}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolveImageUrl(origin, imagePath) {
  const fallback = '/assets/images/couple/casal.png';
  const source = String(imagePath || '').trim() || fallback;

  try {
    return new URL(source, origin).href;
  } catch {
    return new URL(fallback, origin).href;
  }
}

function isCrawlerCompatibleImageUrl(imageUrl) {
  try {
    const pathname = new URL(String(imageUrl || '')).pathname.toLowerCase();
    if (!pathname) {
      return false;
    }

    const hasExplicitExtension = /\.[a-z0-9]+$/.test(pathname);
    if (!hasExplicitExtension) {
      // Keep extensionless absolute URLs to avoid false negatives on CDNs.
      return true;
    }

    return /\.(jpe?g|png)$/.test(pathname);
  } catch {
    return false;
  }
}

function resolveSharePreviewImage(origin, imagePath) {
  const primaryImage = resolveImageUrl(origin, imagePath);
  if (isCrawlerCompatibleImageUrl(primaryImage)) {
    return primaryImage;
  }

  return resolveImageUrl(origin, '/assets/images/couple/casal.png');
}

function inferOgImageType(imageUrl) {
  try {
    const pathname = new URL(String(imageUrl || '')).pathname.toLowerCase();

    if (pathname.endsWith('.png')) {
      return 'image/png';
    }

    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
  } catch {
    return '';
  }

  return '';
}

function buildRedirectUrl(origin, slug, guestToken, section = '') {
  const normalizedSlug = String(slug || '').trim();
  const normalizedToken = String(guestToken || '').trim();
  const normalizedSection = String(section || '').trim();
  const url = new URL(normalizedSlug ? `/${encodeURIComponent(normalizedSlug)}` : '/index.html', origin);

  if (normalizedToken) {
    url.searchParams.set('g', normalizedToken);
  }

  if (normalizedSection) {
    url.searchParams.set('section', normalizedSection);
  }

  return url.href;
}

function normalizeSlugCandidate(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function getClientIp(req) {
  const forwardedFor = req?.headers?.['x-forwarded-for'] || req?.headers?.['X-Forwarded-For'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req?.headers?.['x-real-ip'] || req?.headers?.['X-Real-IP'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return 'unknown';
}

function consumeRateLimit(ip, slug) {
  const now = Date.now();
  const normalizedSlug = normalizeSlugCandidate(slug);
  const ipAndSlugKey = `${ip}::${normalizedSlug}`;
  const lastCheckAt = lastCheckByIpAndSlug.get(ipAndSlugKey) || 0;

  if (normalizedSlug && (now - lastCheckAt) < RATE_LIMIT_SAME_SLUG_GRACE_MS) {
    return { allowed: true, retryAfterSec: 0 };
  }

  const history = requestsByIp.get(ip) || [];
  const recentHistory = history.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentHistory.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - recentHistory[0]));
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    requestsByIp.set(ip, recentHistory);
    return { allowed: false, retryAfterSec };
  }

  recentHistory.push(now);
  requestsByIp.set(ip, recentHistory);
  if (normalizedSlug) {
    lastCheckByIpAndSlug.set(ipAndSlugKey, now);
  }
  return { allowed: true, retryAfterSec: 0 };
}

function validateSlugCandidate(rawSlug) {
  const normalized = normalizeSlugCandidate(rawSlug);

  if (!normalized) {
    return { ok: false, normalized, message: 'slug is required' };
  }

  if (normalized.length < SLUG_MIN_LENGTH) {
    return { ok: false, normalized, message: `slug must have at least ${SLUG_MIN_LENGTH} characters` };
  }

  if (normalized.length > SLUG_MAX_LENGTH) {
    return { ok: false, normalized, message: `slug must have at most ${SLUG_MAX_LENGTH} characters` };
  }

  if (!SLUG_PATTERN.test(normalized)) {
    return { ok: false, normalized, message: 'slug format is invalid' };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return { ok: true, normalized, reserved: true };
  }

  return { ok: true, normalized, reserved: false };
}

async function handleSlugAvailabilityCheck(req, res, supabase) {
  const validation = validateSlugCandidate(req.query?.slug);
  const currentSlug = normalizeSlugCandidate(req.query?.currentSlug);

  if (!validation.ok) {
    return res.status(400).json({
      error: validation.message,
      available: false,
      reason: 'invalid_format',
      normalizedSlug: validation.normalized,
    });
  }

  const ip = getClientIp(req);
  const rateLimit = consumeRateLimit(ip, validation.normalized);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSec));
    return res.status(429).json({
      error: 'Too many requests',
      available: false,
      reason: 'rate_limited',
      retryAfterSec: rateLimit.retryAfterSec,
    });
  }

  if (validation.reserved) {
    return res.status(200).json({
      available: false,
      reason: 'reserved',
      slug: validation.normalized,
    });
  }

  const { data, error } = await supabase
    .from('events')
    .select('id,slug')
    .eq('slug', validation.normalized)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const available = !data || (Boolean(currentSlug) && currentSlug === validation.normalized);

  return res.status(200).json({
    available,
    reason: available ? 'available' : 'taken',
    slug: validation.normalized,
  });
}

export default async function handler(req, res) {
  const mode = String(req.query?.mode || '').trim();

  if (req.method !== 'GET') {
    setJsonHeaders(res);
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (mode === 'share') {
      const slug = normalizeSlug(req.query?.slug);
      const guestToken = String(req.query?.g || '').trim();
      const section = String(req.query?.section || '').trim();

      if (!slug) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(400).send('slug required');
      }

      const supabase = createSupabaseServerClient();

      if (!supabase) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(503).send('Supabase server configuration missing');
      }

      const { data, error } = await supabase
        .from('events')
        .select('slug,couple_names,config,is_active')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(404).send('Event not found');
      }

      const origin = getOrigin(req);
      const config = data.config && typeof data.config === 'object' ? data.config : {};
      const coupleNames = String(config?.couple?.names || data.couple_names || 'Convite').trim() || 'Convite';
      const title = String(config?.texts?.metaTitle || `${coupleNames} - Convite de Casamento`).trim();
      const description = String(
        config?.texts?.metaDescription
        || config?.texts?.description
        || `Abra o convite digital de ${coupleNames}.`
      ).trim();
      const heroImage = resolveSharePreviewImage(origin, config?.media?.heroImage);
      const heroImageType = inferOgImageType(heroImage);
      const heroImageAlt = `${coupleNames} - convite de casamento`;
      const redirectUrl = buildRedirectUrl(origin, data.slug, guestToken, section);
      const pageUrl = redirectUrl;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, max-age=0');

      return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(heroImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(heroImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(heroImageAlt)}">
  ${heroImageType ? `<meta property="og:image:type" content="${escapeHtml(heroImageType)}">` : ''}
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(heroImage)}">
  <meta name="twitter:image:alt" content="${escapeHtml(heroImageAlt)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
  <title>${escapeHtml(title)}</title>
  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
  <p>Redirecionando para o convite...</p>
</body>
</html>`);
    }

    setJsonHeaders(res);

    if (mode === 'client-config') {
      res.setHeader('Cache-Control', 's-maxage=3600');
      const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || '';
      return res.status(200).json({
        supabaseUrl:     process.env.SUPABASE_URL      || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
        commitSha,
      });
    }

    if (mode === 'check-slug') {
      const slugValidation = validateSlugCandidate(req.query?.slug);

      if (!slugValidation.ok) {
        return res.status(400).json({
          error: slugValidation.message,
          available: false,
          reason: 'invalid_format',
          normalizedSlug: slugValidation.normalized,
        });
      }

      const supabase = createSupabaseServerClient();

      if (!supabase) {
        return res.status(503).json({ error: 'Supabase server configuration missing' });
      }

      return await handleSlugAvailabilityCheck(req, res, supabase);
    }

    const slug = normalizeSlug(req.query?.slug);

    if (!slug) {
      return res.status(400).json({ error: 'slug is required' });
    }

    const supabase = createSupabaseServerClient();

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase server configuration missing' });
    }

    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('slug', slug)
      .eq('is_active', true)
      .order('sort_order', { foreignTable: 'event_gifts', ascending: true })
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).json({ error: 'Event not found' });
    }

    const mappedConfig = buildEventConfigResponse(data);
    const galleryImages = await resolveEventGalleryFromStorage(supabase, data.id, data.slug);
    const pixQrUrl = await resolveEventPixQrFromStorage(supabase, data.id, data.slug);
    const withPixQr = applyPixQrToGiftConfig(mappedConfig, pixQrUrl);
    const finalConfig = applyGalleryToHistoriaConfig(withPixQr, galleryImages);

    res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
    return res.status(200).json(finalConfig);
  } catch (error) {
    console.error('[event-config] Failed to load event config', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}