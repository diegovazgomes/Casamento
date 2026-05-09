import { createSupabaseServerClient } from './_lib/supabase-server.js';

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 60;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

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

function setJsonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
}

function normalizeSlug(value) {
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

function consumeRateLimit(ip) {
  const now = Date.now();
  const history = requestsByIp.get(ip) || [];
  const recentHistory = history.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentHistory.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestRequest = recentHistory[0];
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldestRequest));
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    requestsByIp.set(ip, recentHistory);

    return {
      allowed: false,
      retryAfterSec,
    };
  }

  recentHistory.push(now);
  requestsByIp.set(ip, recentHistory);

  return {
    allowed: true,
    retryAfterSec: 0,
  };
}

function validateSlug(rawSlug) {
  const normalized = normalizeSlug(rawSlug);

  if (!normalized) {
    return {
      ok: false,
      normalized,
      message: 'Slug is required',
    };
  }

  if (normalized.length < SLUG_MIN_LENGTH) {
    return {
      ok: false,
      normalized,
      message: `Slug must have at least ${SLUG_MIN_LENGTH} characters`,
    };
  }

  if (normalized.length > SLUG_MAX_LENGTH) {
    return {
      ok: false,
      normalized,
      message: `Slug must have at most ${SLUG_MAX_LENGTH} characters`,
    };
  }

  if (!SLUG_PATTERN.test(normalized)) {
    return {
      ok: false,
      normalized,
      message: 'Slug format is invalid',
    };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return {
      ok: true,
      normalized,
      reserved: true,
    };
  }

  return {
    ok: true,
    normalized,
    reserved: false,
  };
}

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const rateLimit = consumeRateLimit(ip);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSec));
    return res.status(429).json({
      error: 'Too many requests',
      available: false,
      reason: 'rate_limited',
      retryAfterSec: rateLimit.retryAfterSec,
    });
  }

  const rawSlug = req.query?.slug;
  const eventId = String(req.query?.eventId || '').trim();
  const validation = validateSlug(rawSlug);

  if (!validation.ok) {
    return res.status(400).json({
      error: validation.message,
      available: false,
      reason: 'invalid_format',
      normalizedSlug: validation.normalized,
    });
  }

  if (validation.reserved) {
    return res.status(200).json({
      available: false,
      reason: 'reserved',
      slug: validation.normalized,
    });
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .eq('slug', validation.normalized)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const isCurrentEvent = Boolean(data?.id) && Boolean(eventId) && String(data.id) === eventId;
    const available = !data || isCurrentEvent;

    return res.status(200).json({
      available,
      reason: available ? 'available' : 'taken',
      slug: validation.normalized,
    });
  } catch (error) {
    console.error('[check-slug] Failed to check slug availability', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
