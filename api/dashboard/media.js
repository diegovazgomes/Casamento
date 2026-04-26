import { readFile } from 'fs/promises';

import formidable from 'formidable';

import {
  authenticateSupabaseUser,
  createSupabaseServerClient,
  getEventById,
} from '../_lib/supabase-server.js';
import { verifyDashboardToken } from './auth.js';

const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Content-Type', 'application/json');
}

function getAuthToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return '';
  }

  return authHeader.slice('Bearer '.length).trim();
}

async function authenticateRequest(req, supabase) {
  const token = getAuthToken(req);

  if (verifyDashboardToken(token)) {
    return { mode: 'dashboard-token' };
  }

  const authResult = await authenticateSupabaseUser(req, supabase);
  if (authResult.error) {
    return authResult;
  }

  return {
    mode: 'supabase-user',
    user: authResult.user,
  };
}

function getSingleValue(value) {
  if (Array.isArray(value)) {
    return getSingleValue(value[0]);
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function getSingleFile(files) {
  if (Array.isArray(files)) {
    return files[0] || null;
  }

  return files || null;
}

function sanitizeBaseName(fileName) {
  const source = String(fileName || 'upload')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');

  return source || 'upload';
}

function resolveFileExtension(file) {
  const mimeType = file?.mimetype || '';
  const mappedExtension = MIME_EXTENSION_MAP[mimeType];

  if (mappedExtension) {
    return mappedExtension;
  }

  const originalName = String(file?.originalFilename || '');
  const extension = originalName.includes('.') ? originalName.split('.').pop().toLowerCase() : '';
  return extension || 'bin';
}

function buildStoragePath(eventId, type, file) {
  const extension = resolveFileExtension(file);

  if (type === 'hero') {
    return `${eventId}/hero.${extension}`;
  }

  const safeBaseName = sanitizeBaseName(file?.originalFilename);
  return `${eventId}/gallery/${Date.now()}-${safeBaseName}.${extension}`;
}

function parseMultipartForm(req) {
  const form = formidable({
    allowEmptyFiles: false,
    keepExtensions: true,
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024,
    multiples: false,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase server configuration missing' });
  }

  try {
    const authResult = await authenticateRequest(req, supabase);

    if (authResult.error) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { fields, files } = await parseMultipartForm(req);
    const eventId = getSingleValue(fields.eventId);
    const type = getSingleValue(fields.type);
    const file = getSingleFile(files.file);

    if (!eventId) {
      return res.status(400).json({ error: 'eventId required' });
    }

    if (!['hero', 'gallery'].includes(type)) {
      return res.status(400).json({ error: 'type must be hero or gallery' });
    }

    if (!file) {
      return res.status(400).json({ error: 'file required' });
    }

    if (!Object.keys(MIME_EXTENSION_MAP).includes(file.mimetype || '')) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const currentEvent = await getEventById(supabase, eventId);

    if (!currentEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (authResult.mode === 'supabase-user' && currentEvent.user_id !== authResult.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const buffer = await readFile(file.filepath);
    const storagePath = buildStoragePath(eventId, type, file);
    const storage = supabase.storage.from('event-media');
    const { error: uploadError } = await storage.upload(storagePath, buffer, {
      contentType: file.mimetype,
      upsert: type === 'hero',
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = storage.getPublicUrl(storagePath);

    return res.status(200).json({
      eventId,
      path: storagePath,
      type,
      url: data?.publicUrl || '',
    });
  } catch (error) {
    console.error('[dashboard/media] Failed to upload media', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}