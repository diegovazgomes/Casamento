import { readFile } from 'fs/promises';

import formidable from 'formidable';

import { requireOwnedEvent } from '../_lib/dashboard-auth.js';

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
    return `${eventId}/hero/hero.${extension}`;
  }

  if (type === 'pix-qr') {
    return `${eventId}/pix/pix-qr.${extension}`;
  }

  const safeBaseName = sanitizeBaseName(file?.originalFilename);
  return `${eventId}/gallery/${Date.now()}-${safeBaseName}.${extension}`;
}

async function clearStorageFolder(storage, prefix) {
  const { data, error } = await storage.list(prefix, { limit: 100 });
  if (error || !Array.isArray(data) || data.length === 0) return;
  const paths = data
    .filter((entry) => Boolean(entry?.name))
    .map((entry) => `${prefix}/${entry.name}`);
  if (paths.length > 0) {
    await storage.remove(paths);
  }
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

  try {
    const { fields, files } = await parseMultipartForm(req);
    const eventId = getSingleValue(fields.eventId);
    const type = getSingleValue(fields.type);
    const file = getSingleFile(files.file);

    if (!eventId) {
      return res.status(400).json({ error: 'eventId required' });
    }

    if (!['hero', 'gallery', 'pix-qr'].includes(type)) {
      return res.status(400).json({ error: 'type must be hero, gallery or pix-qr' });
    }

    if (!file) {
      return res.status(400).json({ error: 'file required' });
    }

    if (!Object.keys(MIME_EXTENSION_MAP).includes(file.mimetype || '')) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Passa explicitamente headers — spread de IncomingMessage (classe Node.js)
    // não copia propriedades não-enumeráveis em ambientes serverless (Vercel),
    // fazendo req.headers chegar undefined em extractBearerToken → 401.
    const ownedEvent = await requireOwnedEvent({
      headers: req.headers,
      body: { eventId },
      query: { eventId },
    }, {
      selectClause: 'id,user_id,slug,config',
    });

    if (!ownedEvent.ok) {
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    const buffer = await readFile(file.filepath);
    const storagePath = buildStoragePath(eventId, type, file);
    const storage = ownedEvent.supabase.storage.from('event-media');

    if (type === 'hero' || type === 'pix-qr') {
      const folderPrefix = type === 'hero' ? `${eventId}/hero` : `${eventId}/pix`;
      await clearStorageFolder(storage, folderPrefix);
    }

    const { error: uploadError } = await storage.upload(storagePath, buffer, {
      contentType: file.mimetype,
      upsert: type === 'hero' || type === 'pix-qr',
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