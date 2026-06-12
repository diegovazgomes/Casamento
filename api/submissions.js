import { createSupabaseServerClient } from './_lib/supabase-server.js';
import { consumeRateLimit, getClientIp } from './_lib/rate-limit.js';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_SCOPE = 'submissions';

const FREE_RSVP_LIMIT = 50;
const RSVP_TABLE = 'rsvp_confirmations';
const GUEST_TABLE = 'guest_submissions';
const GUEST_VIEWS_TABLE = 'guest_views';
const PLATFORM_EVENTS_TABLE = 'platform_events';
const ALLOWED_TABLES = new Set([RSVP_TABLE, GUEST_TABLE, GUEST_VIEWS_TABLE, PLATFORM_EVENTS_TABLE]);
const RSVP_ATTENDANCE = new Set(['yes', 'no']);
const GUEST_TYPES = new Set(['message', 'song']);
const DEVICE_TYPES = new Set(['mobile', 'tablet', 'desktop']);
const PLATFORM_EVENT_NAMES = new Set([
  'landing_view',
  'landing_cta_click',
  'example_invite_view',
  'page_engaged',
  'signup_started',
  'signup_completed',
  'login_started',
  'login_completed',
  'checkout_started',
  'checkout_completed',
  'dashboard_opened',
]);
const DEMO_SUBMISSIONS_BLOCKED_CODE = 'DEMO_PUBLIC_SUBMISSIONS_BLOCKED';
const DEMO_SUBMISSIONS_BLOCKED_MESSAGE = 'Este convite e demonstrativo. RSVP, mensagens e musicas estao desativados no exemplo.';

function isDemoPublicShowcaseEvent(eventRecord) {
  const demoConfig = eventRecord?.config?.demo;
  if (!demoConfig || typeof demoConfig !== 'object') {
    return false;
  }

  return demoConfig.publicShowcase === true
    || demoConfig.blockPublicSubmissions === true
    || demoConfig.locked === true;
}

async function findSubmissionEvent(supabase, eventReference) {
  const normalizedReference = String(eventReference || '').trim();
  if (!normalizedReference) {
    return null;
  }

  const eventsTable = supabase?.from?.('events');
  if (!eventsTable || typeof eventsTable.select !== 'function') {
    return null;
  }

  try {
    const bySlugQuery = supabase
      .from('events')
      .select('id,slug,config')
      .eq('slug', normalizedReference)
      .maybeSingle();

    if (bySlugQuery && typeof bySlugQuery.then === 'function') {
      const { data: bySlugEvent, error: bySlugError } = await bySlugQuery;
      if (!bySlugError && bySlugEvent) {
        return bySlugEvent;
      }
    }

    const byIdQuery = supabase
      .from('events')
      .select('id,slug,config')
      .eq('id', normalizedReference)
      .maybeSingle();

    if (byIdQuery && typeof byIdQuery.then === 'function') {
      const { data: byIdEvent, error: byIdError } = await byIdQuery;
      if (!byIdError && byIdEvent) {
        return byIdEvent;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function isUnsupportedRsvpColumnError(error) {
  const haystack = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes('group_name') || haystack.includes('group_max_confirmations');
}

function stripOptionalRsvpColumns(payload) {
  const nextPayload = { ...payload };
  delete nextPayload.group_name;
  delete nextPayload.group_max_confirmations;
  return nextPayload;
}

function isUnsupportedGuestViewColumnError(error) {
  const haystack = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes('page_path')
    || haystack.includes('duration_seconds')
    || haystack.includes('device_type');
}

function stripOptionalGuestViewColumns(payload) {
  const nextPayload = { ...payload };
  delete nextPayload.page_path;
  delete nextPayload.duration_seconds;
  delete nextPayload.device_type;
  return nextPayload;
}

async function checkRsvpLimit(supabase, eventId) {
  try {
    const { data: event } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .maybeSingle();

    if (!event?.user_id) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', event.user_id)
      .maybeSingle();

    const plan = String(profile?.plan || 'free').toLowerCase();
    if (plan === 'premium') return null;

    const { count } = await supabase
      .from('rsvp_confirmations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if ((count || 0) >= FREE_RSVP_LIMIT) {
      return {
        code: 'RSVP_LIMIT_REACHED',
        message: `Este convite atingiu o limite de ${FREE_RSVP_LIMIT} confirmações do plano gratuito.`,
        details: '',
        hint: '',
      };
    }
  } catch (err) {
    console.warn('[submissions] checkRsvpLimit falhou:', err?.message);
  }
  return null;
}

async function insertSubmission(supabase, table, payload) {
  const { error } = await supabase
    .from(table)
    .insert(payload);

  if (!error) {
    return { ok: true, error: null };
  }

  if (table === RSVP_TABLE && isUnsupportedRsvpColumnError(error)) {
    const fallbackPayload = stripOptionalRsvpColumns(payload);
    const fallbackResult = await supabase
      .from(table)
      .insert(fallbackPayload);

    if (!fallbackResult.error) {
      console.warn('[api/submissions] RSVP salvo sem colunas opcionais de grupo por compatibilidade de schema.');
      return { ok: true, error: null };
    }

    return { ok: false, error: fallbackResult.error };
  }

  if (table === GUEST_VIEWS_TABLE && isUnsupportedGuestViewColumnError(error)) {
    const fallbackPayload = stripOptionalGuestViewColumns(payload);
    const fallbackResult = await supabase
      .from(table)
      .insert(fallbackPayload);

    if (!fallbackResult.error) {
      console.warn('[api/submissions] guest_views salvo sem colunas opcionais por compatibilidade de schema.');
      return { ok: true, error: null };
    }

    return { ok: false, error: fallbackResult.error };
  }

  return { ok: false, error };
}

function parseJsonBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  if (typeof body === 'object') {
    return body;
  }

  return {};
}

async function readJsonBody(req) {
  const parsedInline = parseJsonBody(req?.body);
  if (Object.keys(parsedInline).length > 0) {
    return parsedInline;
  }

  if (!req || typeof req.on !== 'function') {
    return parsedInline;
  }

  const chunks = [];

  try {
    const rawBody = await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      });
      req.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
      req.on('error', reject);
    });

    return parseJsonBody(rawBody);
  } catch {
    return {};
  }
}

function sanitizeRsvpPayload(payload) {
  const hasGroupName = Object.prototype.hasOwnProperty.call(payload || {}, 'group_name');
  const hasGroupMax = Object.prototype.hasOwnProperty.call(payload || {}, 'group_max_confirmations');

  const next = {
    name: String(payload?.name || '').trim(),
    phone: String(payload?.phone || '').trim(),
    attendance: String(payload?.attendance || '').trim(),
    event_id: String(payload?.event_id || '').trim(),
    source: String(payload?.source || 'website').trim(),
    user_agent: payload?.user_agent ? String(payload.user_agent).slice(0, 200) : null,
    referrer: payload?.referrer ? String(payload.referrer).slice(0, 200) : null,
    token_id: payload?.token_id || null,
    marketing_consent: Boolean(payload?.marketing_consent),
    marketing_consent_at: payload?.marketing_consent_at || null,
  };

  if (hasGroupName) {
    next.group_name = payload?.group_name ?? null;
  }

  if (hasGroupMax) {
    next.group_max_confirmations = payload?.group_max_confirmations ?? null;
  }

  if (!next.name || !next.phone || !next.event_id || !RSVP_ATTENDANCE.has(next.attendance)) {
    return null;
  }

  return next;
}

function sanitizeGuestPayload(payload) {
  const next = {
    type: String(payload?.type || '').trim(),
    guest_name: String(payload?.guest_name || '').trim(),
    event_id: String(payload?.event_id || '').trim(),
    source: String(payload?.source || 'website').trim(),
    user_agent: payload?.user_agent ? String(payload.user_agent).slice(0, 200) : null,
    referrer: payload?.referrer ? String(payload.referrer).slice(0, 200) : null,
    message: payload?.message ? String(payload.message).trim() : null,
    song_title: payload?.song_title ? String(payload.song_title).trim() : null,
    song_artist: payload?.song_artist ? String(payload.song_artist).trim() : null,
    song_notes: payload?.song_notes ? String(payload.song_notes).trim() : null,
  };

  if (!next.event_id || !GUEST_TYPES.has(next.type)) {
    return null;
  }

  if (next.type === 'message' && !next.message) {
    return null;
  }

  if (next.type === 'song' && !next.song_title) {
    return null;
  }

  return next;
}

function normalizeOptionalInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOptionalTimestamp(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function sanitizeGuestViewPayload(payload) {
  const next = {
    event_id: String(payload?.event_id || '').trim(),
    token_id: payload?.token_id || null,
    opened_at: normalizeOptionalTimestamp(payload?.opened_at) || new Date().toISOString(),
    duration_seconds: normalizeOptionalInteger(payload?.duration_seconds),
    device_type: payload?.device_type ? String(payload.device_type).trim().toLowerCase() : null,
    page_path: payload?.page_path ? String(payload.page_path).trim().slice(0, 160) : null,
  };

  if (!next.event_id) {
    return null;
  }

  if (next.device_type && !DEVICE_TYPES.has(next.device_type)) {
    return null;
  }

  if (next.duration_seconds !== null && next.duration_seconds < 0) {
    return null;
  }

  return next;
}

function sanitizeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 24)
      .map(([key, entryValue]) => [
        String(key).slice(0, 48),
        typeof entryValue === 'string'
          ? entryValue.slice(0, 180)
          : entryValue,
      ])
  );
}

function sanitizePlatformEventPayload(payload) {
  const eventName = String(payload?.event_name || '').trim();
  const deviceType = payload?.device_type ? String(payload.device_type).trim().toLowerCase() : null;

  const next = {
    event_name: eventName,
    session_id: payload?.session_id ? String(payload.session_id).trim().slice(0, 120) : null,
    user_id: payload?.user_id || null,
    page_path: payload?.page_path ? String(payload.page_path).trim().slice(0, 180) : null,
    referrer: payload?.referrer ? String(payload.referrer).trim().slice(0, 260) : null,
    utm_source: payload?.utm_source ? String(payload.utm_source).trim().slice(0, 120) : null,
    utm_medium: payload?.utm_medium ? String(payload.utm_medium).trim().slice(0, 120) : null,
    utm_campaign: payload?.utm_campaign ? String(payload.utm_campaign).trim().slice(0, 160) : null,
    device_type: deviceType,
    metadata: sanitizeMetadata(payload?.metadata),
  };

  if (!PLATFORM_EVENT_NAMES.has(next.event_name)) {
    return null;
  }

  if (next.device_type && !DEVICE_TYPES.has(next.device_type)) {
    return null;
  }

  return next;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rateLimit = await consumeRateLimit({
    scope: RATE_LIMIT_SCOPE,
    identifier: getClientIp(req),
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSec || 60));
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  const body = await readJsonBody(req);
  const table = String(body?.table || '').trim();

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  let payload = null;

  if (table === RSVP_TABLE) {
    payload = sanitizeRsvpPayload(body?.payload);
  } else if (table === GUEST_TABLE) {
    payload = sanitizeGuestPayload(body?.payload);
  } else if (table === GUEST_VIEWS_TABLE) {
    payload = sanitizeGuestViewPayload(body?.payload);
  } else if (table === PLATFORM_EVENTS_TABLE) {
    payload = sanitizePlatformEventPayload(body?.payload);
  }

  if (!payload) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid payload',
      details: '',
      hint: '',
    });
  }

  try {
    const submissionEvent = table === PLATFORM_EVENTS_TABLE ? null : await findSubmissionEvent(supabase, payload.event_id);
    if (isDemoPublicShowcaseEvent(submissionEvent)) {
      return res.status(403).json({
        code: DEMO_SUBMISSIONS_BLOCKED_CODE,
        message: DEMO_SUBMISSIONS_BLOCKED_MESSAGE,
        details: '',
        hint: '',
      });
    }

    // Verificar limite de convidados para plano free
    if (table === RSVP_TABLE && payload.event_id) {
      const limitCheckEventId = submissionEvent?.id || payload.event_id;
      const limitError = await checkRsvpLimit(supabase, limitCheckEventId);
      if (limitError) return res.status(429).json(limitError);
    }

    const result = await insertSubmission(supabase, table, payload);

    if (!result.ok) {
      const error = result.error;
      console.warn('[api/submissions] Insert failed', {
        table,
        code: error.code || null,
        message: error.message || 'Insert failed',
      });

      return res.status(400).json({
        code: error.code || null,
        message: error.message || 'Insert failed',
      });
    }

    return res.status(201).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      code: null,
      message: error.message || 'Internal server error',
      details: '',
      hint: '',
    });
  }
}
