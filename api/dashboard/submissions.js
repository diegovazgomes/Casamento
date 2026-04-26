/**
 * Endpoint: GET /api/dashboard/submissions
 *
 * Lista mensagens e sugestões de música salvas em guest_submissions.
 * Requer: Authorization: Bearer <token>
 */

import { createClient } from '@supabase/supabase-js';
import { requireOwnedEvent } from '../_lib/dashboard-auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return handleListSubmissions(req, res);
}

async function handleListSubmissions(req, res) {
  const {
    type = '',
    page = '1',
    pageSize = '20',
    search = '',
  } = req.query;

  if (type && type !== 'message' && type !== 'song') {
    return res.status(400).json({ error: 'type must be message or song' });
  }

  try {
    const ownedEvent = await requireOwnedEvent(req, {
      selectClause: 'id,slug,user_id,config',
    });

    if (!ownedEvent.ok) {
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    const supabase = ownedEvent.supabase;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (pageNum - 1) * size;

    let query = supabase
      .from('guest_submissions')
      .select(
        `
        id,
        type,
        guest_name,
        message,
        song_title,
        song_artist,
        song_notes,
        source,
        created_at
        `,
        { count: 'exact' }
      )
      .eq('event_id', ownedEvent.event.id);

    if (type) {
      query = query.eq('type', type);
    }

    const searchTerm = String(search || '').trim();
    if (searchTerm) {
      const escapedTerm = searchTerm.replace(/,/g, '\\,');
      const pattern = `%${escapedTerm}%`;

      const conditions = type === 'message'
        ? [
            `guest_name.ilike.${pattern}`,
            `message.ilike.${pattern}`,
          ]
        : type === 'song'
          ? [
              `guest_name.ilike.${pattern}`,
              `song_title.ilike.${pattern}`,
              `song_artist.ilike.${pattern}`,
              `song_notes.ilike.${pattern}`,
            ]
          : [
              `guest_name.ilike.${pattern}`,
              `message.ilike.${pattern}`,
              `song_title.ilike.${pattern}`,
              `song_artist.ilike.${pattern}`,
              `song_notes.ilike.${pattern}`,
            ];

      query = query.or(conditions.join(','));
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + size - 1);

    if (error) throw error;

    const rows = (data || []).map((item) => ({
      id: item.id,
      type: item.type,
      guestName: item.guest_name || '',
      contentPreview: buildContentPreview(item),
      message: item.message || '',
      songTitle: item.song_title || '',
      songArtist: item.song_artist || '',
      songNotes: item.song_notes || '',
      source: item.source || '',
      submittedAt: item.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        pageSize: size,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / size),
      },
    });
  } catch (error) {
    console.error('[submissions GET]', error);
    return res.status(500).json({ error: error.message });
  }
}

function buildContentPreview(item) {
  if (item.type === 'message') {
    return truncate(item.message || '', 180);
  }

  const songParts = [item.song_title, item.song_artist].filter(Boolean).join(' - ');
  return truncate(songParts || item.song_notes || '', 180);
}

function truncate(text, maxLength) {
  const normalized = String(text || '').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}
