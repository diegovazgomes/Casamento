import { buildEventConfigResponse } from './_lib/event-config.js';
import { createSupabaseServerClient } from './_lib/supabase-server.js';

const CACHE_CONTROL_HEADER = 's-maxage=60, stale-while-revalidate=300';
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

function normalizeSlug(rawSlug) {
  if (Array.isArray(rawSlug)) {
    return normalizeSlug(rawSlug[0]);
  }

  if (typeof rawSlug !== 'string') {
    return '';
  }

  return rawSlug.trim();
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const slug = normalizeSlug(req.query?.slug);

  if (!slug) {
    return res.status(400).json({ error: 'slug is required' });
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  try {
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

    res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
    return res.status(200).json(buildEventConfigResponse(data));
  } catch (error) {
    console.error('[event-config] Failed to load event config', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}