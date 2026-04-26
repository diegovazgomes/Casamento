import { buildEventConfigResponse, mergeDeep } from '../_lib/event-config.js';
import {
  buildEventUpdatePayload,
  getDashboardEventLookup,
  requireOwnedEvent,
} from '../_lib/dashboard-auth.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (req.method === 'GET') {
      const ownedEvent = await requireOwnedEvent(req, {
        selectClause: `${EVENT_RESPONSE_SELECT},event_gifts(id,type,enabled,sort_order,config)`,
      });

      if (!ownedEvent.ok) {
        return res.status(ownedEvent.status).json({ error: ownedEvent.error });
      }

      return res.status(200).json({
        event: {
          id: ownedEvent.event.id,
          slug: ownedEvent.event.slug,
          user_id: ownedEvent.event.user_id,
          active_theme: ownedEvent.event.active_theme,
          active_layout: ownedEvent.event.active_layout,
          updated_at: ownedEvent.event.updated_at,
        },
        config: buildEventConfigResponse(ownedEvent.event),
      });
    }

    const lookup = getDashboardEventLookup(req);
    const { eventId, slug, ...body } = req.body || {};

    const ownedEvent = await requireOwnedEvent(req, {
      lookup,
      selectClause: 'id,user_id,config,slug',
    });

    if (!ownedEvent.ok) {
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    const { update, error } = buildEventUpdatePayload(body, FIELD_MAP, ownedEvent.event.config ?? {}, mergeDeep);

    if (error) {
      return res.status(400).json({ error });
    }

    const { data, error: updateError } = await ownedEvent.supabase
      .from('events')
      .update(update)
      .eq('id', ownedEvent.event.id)
      .eq('user_id', ownedEvent.user.id)
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