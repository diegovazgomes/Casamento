import {
  authenticateSupabaseUser,
  createSupabaseServerClient,
} from './supabase-server.js';

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function getLookupValue(value) {
  return String(value || '').trim();
}

export function getDashboardEventLookup(req) {
  const query = req?.query || {};
  const body = req?.body || {};

  return {
    eventId: getLookupValue(query.eventId || body.eventId),
    slug: getLookupValue(query.slug || body.slug),
  };
}

export async function authenticateDashboardRequest(req) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      status: 503,
      error: 'Supabase server configuration missing',
    };
  }

  const authResult = await authenticateSupabaseUser(req, supabase);

  if (authResult.error) {
    return {
      ok: false,
      status: authResult.status,
      error: authResult.error,
      supabase,
    };
  }

  return {
    ok: true,
    supabase,
    user: authResult.user,
    token: authResult.token,
  };
}

export async function findOwnedEventRecord(supabase, userId, lookup, selectClause) {
  if (!lookup?.eventId && !lookup?.slug) {
    return null;
  }

  let query = supabase
    .from('events')
    .select(selectClause)
    .eq('user_id', userId);

  if (lookup.eventId) {
    query = query.eq('id', lookup.eventId);
  } else {
    query = query.eq('slug', lookup.slug);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function requireOwnedEvent(req, options = {}) {
  const auth = await authenticateDashboardRequest(req);

  if (!auth.ok) {
    return auth;
  }

  const lookup = options.lookup || getDashboardEventLookup(req);

  if (!lookup.eventId && !lookup.slug) {
    return {
      ok: false,
      status: 400,
      error: 'eventId or slug required',
      supabase: auth.supabase,
      user: auth.user,
    };
  }

  const selectClause = options.selectClause || 'id,slug,user_id,config';
  const event = await findOwnedEventRecord(auth.supabase, auth.user.id, lookup, selectClause);

  if (!event) {
    return {
      ok: false,
      status: 404,
      error: 'Event not found',
      supabase: auth.supabase,
      user: auth.user,
    };
  }

  return {
    ok: true,
    supabase: auth.supabase,
    user: auth.user,
    token: auth.token,
    event,
    lookup,
  };
}

export async function findOwnedGuestToken(supabase, userId, tokenId, selectClause = 'id,event_id,group_name,max_confirmations,phone,notes,token,created_at') {
  if (!tokenId) {
    return null;
  }

  const { data, error } = await supabase
    .from('guest_tokens')
    .select(`${selectClause},events!inner(id,user_id,slug)`)
    .eq('id', tokenId)
    .eq('events.user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function buildEventUpdatePayload(body, fieldMap, existingConfig, mergeDeep) {
  const update = {};

  Object.entries(fieldMap).forEach(([inputKey, columnName]) => {
    if (hasOwn(body, inputKey)) {
      update[columnName] = body[inputKey];
    }
  });

  if (hasOwn(body, 'config')) {
    if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
      return { error: 'config must be an object' };
    }

    update.config = mergeDeep(existingConfig, body.config);
  }

  if (!Object.keys(update).length) {
    return { error: 'No valid fields to update' };
  }

  return { update };
}