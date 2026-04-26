import { mergeDeep } from '../_lib/event-config.js';
import {
  authenticateSupabaseUser,
  createSupabaseServerClient,
  getEventById,
} from '../_lib/supabase-server.js';

const EVENT_RESPONSE_SELECT = [
  'id',
  'slug',
  'user_id',
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
  'is_active',
  'config',
  'updated_at',
].join(',');

const FIELD_MAP = {
  slug: 'slug',
  coupleNames: 'couple_names',
  couple_names: 'couple_names',
  brideName: 'bride_name',
  bride_name: 'bride_name',
  groomName: 'groom_name',
  groom_name: 'groom_name',
  eventDate: 'event_date',
  event_date: 'event_date',
  eventTime: 'event_time',
  event_time: 'event_time',
  venueName: 'venue_name',
  venue_name: 'venue_name',
  venueAddress: 'venue_address',
  venue_address: 'venue_address',
  venueMapsLink: 'venue_maps_link',
  venue_maps_link: 'venue_maps_link',
  activeTheme: 'active_theme',
  active_theme: 'active_theme',
  activeLayout: 'active_layout',
  active_layout: 'active_layout',
  isActive: 'is_active',
  is_active: 'is_active',
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildEventUpdatePayload(body, existingConfig) {
  const update = {};

  Object.entries(FIELD_MAP).forEach(([inputKey, columnName]) => {
    if (hasOwn(body, inputKey)) {
      update[columnName] = body[inputKey];
    }
  });

  if (hasOwn(body, 'config')) {
    if (!isPlainObject(body.config)) {
      return { error: 'config must be an object' };
    }

    update.config = mergeDeep(existingConfig, body.config);
  }

  if (!Object.keys(update).length) {
    return { error: 'No valid fields to update' };
  }

  return { update };
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  try {
    const authResult = await authenticateSupabaseUser(req, supabase);

    if (authResult.error) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { eventId, ...body } = req.body || {};

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'eventId required' });
    }

    const currentEvent = await getEventById(supabase, eventId);

    if (!currentEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (currentEvent.user_id !== authResult.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { update, error } = buildEventUpdatePayload(body, currentEvent.config ?? {});

    if (error) {
      return res.status(400).json({ error });
    }

    const { data, error: updateError } = await supabase
      .from('events')
      .update(update)
      .eq('id', eventId)
      .eq('user_id', authResult.user.id)
      .select(EVENT_RESPONSE_SELECT)
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ event: data });
  } catch (error) {
    console.error('[dashboard/event] Failed to update event', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}