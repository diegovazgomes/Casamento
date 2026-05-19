import { createSupabaseServerClient } from './_lib/supabase-server.js';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const requestsByIp = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const history = (requestsByIp.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (history.length >= RATE_LIMIT_MAX) {
    requestsByIp.set(ip, history);
    return true;
  }
  history.push(now);
  requestsByIp.set(ip, history);
  return false;
}

const FREE_RSVP_LIMIT = 50;
const RSVP_TABLE = 'rsvp_confirmations';
const GUEST_TABLE = 'guest_submissions';
const ALLOWED_TABLES = new Set([RSVP_TABLE, GUEST_TABLE]);
const RSVP_ATTENDANCE = new Set(['yes', 'no']);
const GUEST_TYPES = new Set(['message', 'song']);
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
  } catch {
    // Silencioso — não bloquear o RSVP por falha de verificação
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

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  const body = parseJsonBody(req.body);
  const table = String(body?.table || '').trim();

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  const payload = table === RSVP_TABLE
    ? sanitizeRsvpPayload(body?.payload)
    : sanitizeGuestPayload(body?.payload);

  if (!payload) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid payload',
      details: '',
      hint: '',
    });
  }

  try {
    const submissionEvent = await findSubmissionEvent(supabase, payload.event_id);
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
