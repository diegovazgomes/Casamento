import { readFile } from 'fs/promises';

import formidable from 'formidable';

import {
  getUserPlan,
  requireOwnedEvent,
} from '../_lib/dashboard-auth.js';

const GALLERY_LIMIT_FREE = 3;
const GALLERY_LIMIT_PREMIUM = 5;

const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const GALLERY_IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp)$/i;
const AUDIO_EXTENSION_PATTERN = /\.(mp3|m4a|ogg|wav|aac)$/i;

function isFileTooLargeError(error) {
  const code = Number(error?.code);
  const httpCode = Number(error?.httpCode);
  const message = String(error?.message || '');
  return code === 1009
    || httpCode === 413
    || /maxfilesize|bigger than|max file size/i.test(message);
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
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

function sanitizeGalleryFileName(fileName) {
  return String(fileName || '')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop() || '';
}

function stripOrderPrefix(fileName) {
  return String(fileName || '').replace(/^\d{3,6}-/, '');
}

function toOrderedFileName(fileName, index) {
  const safeBase = stripOrderPrefix(sanitizeGalleryFileName(fileName)) || `imagem-${index + 1}`;
  const orderPrefix = String(index + 1).padStart(3, '0');
  return `${orderPrefix}-${safeBase}`;
}

function buildGalleryAltFromName(fileName, index) {
  const fallback = `Foto ${index + 1}`;
  const normalized = stripOrderPrefix(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function extractGalleryFileName(value) {
  const source = String(value || '').trim();
  if (!source) return '';

  const match = source.match(/\/gallery\/([^/?#]+)$/i);
  if (match?.[1]) {
    return sanitizeGalleryFileName(decodeURIComponent(match[1]));
  }

  return sanitizeGalleryFileName(source);
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

function buildStoragePath(storageRoot, type, file) {
  const extension = resolveFileExtension(file);

  if (type === 'hero') {
    return `${storageRoot}/hero/hero.${extension}`;
  }

  if (type === 'pix-qr') {
    return `${storageRoot}/pix/pix-qr.${extension}`;
  }

  const safeBaseName = sanitizeBaseName(file?.originalFilename);
  return `${storageRoot}/gallery/${Date.now()}-${safeBaseName}.${extension}`;
}

async function normalizeHeroImageBuffer(buffer) {
  try {
    const { default: sharp } = await import('sharp');

    return await sharp(buffer)
      .rotate()
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
  } catch {
    // Fallback seguro: se o processamento falhar, não interrompe o upload.
    return buffer;
  }
}

function getEventStorageRoot(eventRecord, fallbackEventId = '') {
  const eventSlug = String(eventRecord?.slug || '').trim();
  if (eventSlug) {
    return eventSlug;
  }

  return String(eventRecord?.id || fallbackEventId || '').trim();
}

async function loadGalleryEntries(storage, storageRoot) {
  const { data, error } = await storage.list(`${storageRoot}/gallery`, {
    limit: 500,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : [])
    .map((entry) => ({ ...entry, name: sanitizeGalleryFileName(entry?.name) }))
    .filter((entry) => Boolean(entry.name) && GALLERY_IMAGE_EXTENSION_PATTERN.test(entry.name));
}

function buildGalleryResponseItems(storage, storageRoot, entries) {
  return entries.map((entry, index) => {
    const name = sanitizeGalleryFileName(entry?.name);
    const path = `${storageRoot}/gallery/${name}`;
    const { data } = storage.getPublicUrl(path);

    return {
      name,
      path,
      url: data?.publicUrl || '',
      alt: buildGalleryAltFromName(name, index),
    };
  });
}

async function removeOtherFilesInFolder(storage, prefix, keepName) {
  try {
    const { data, error } = await storage.list(prefix, { limit: 100 });
    if (error || !Array.isArray(data) || data.length === 0) return;
    const paths = data
      .filter((entry) => Boolean(entry?.name) && entry.name !== keepName)
      .map((entry) => `${prefix}/${entry.name}`);
    if (paths.length > 0) {
      await storage.remove(paths);
    }
  } catch {
    // Non-blocking: cleanup failure must not affect the upload result
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

async function resolveOwnedEventFromRequest(req, eventId) {
  const normalizedEventId = getSingleValue(eventId);

  return requireOwnedEvent({
    headers: req.headers,
    body: { eventId: normalizedEventId },
    query: { eventId: normalizedEventId },
  }, {
    selectClause: 'id,user_id,slug,config',
  });
}

async function handleGalleryList(req, res, eventId) {
  if (!eventId) {
    return res.status(400).json({ error: 'eventId required' });
  }

  const ownedEvent = await resolveOwnedEventFromRequest(req, eventId);
  if (!ownedEvent.ok) {
    return res.status(ownedEvent.status).json({ error: ownedEvent.error });
  }

  const storageRoot = getEventStorageRoot(ownedEvent.event, eventId);
  const storage = ownedEvent.supabase.storage.from('event-media');
  const entries = await loadGalleryEntries(storage, storageRoot);
  const items = buildGalleryResponseItems(storage, storageRoot, entries);

  return res.status(200).json({
    eventId: ownedEvent.event.id,
    storageRoot,
    items,
  });
}

async function handleGalleryDelete(req, res) {
  const eventId = getSingleValue(req.body?.eventId || req.query?.eventId);
  if (!eventId) {
    return res.status(400).json({ error: 'eventId required' });
  }

  const ownedEvent = await resolveOwnedEventFromRequest(req, eventId);
  if (!ownedEvent.ok) {
    return res.status(ownedEvent.status).json({ error: ownedEvent.error });
  }

  const storageRoot = getEventStorageRoot(ownedEvent.event, eventId);
  const storage = ownedEvent.supabase.storage.from('event-media');
  const entries = await loadGalleryEntries(storage, storageRoot);
  const existingNames = new Set(entries.map((entry) => entry.name));

  const rawNames = [
    ...(Array.isArray(req.body?.names) ? req.body.names : []),
    ...(Array.isArray(req.body?.paths) ? req.body.paths : []),
  ];

  const namesToDelete = rawNames
    .map((value) => extractGalleryFileName(value))
    .filter((name, index, array) => Boolean(name) && array.indexOf(name) === index && existingNames.has(name));

  if (namesToDelete.length === 0) {
    return res.status(200).json({ deleted: [], deletedCount: 0, remainingCount: entries.length });
  }

  const paths = namesToDelete.map((name) => `${storageRoot}/gallery/${name}`);
  const { error } = await storage.remove(paths);
  if (error) {
    throw error;
  }

  return res.status(200).json({
    deleted: namesToDelete,
    deletedCount: namesToDelete.length,
  });
}

async function handleGalleryReorder(req, res) {
  const eventId = getSingleValue(req.body?.eventId || req.query?.eventId);
  if (!eventId) {
    return res.status(400).json({ error: 'eventId required' });
  }

  const rawOrder = Array.isArray(req.body?.order) ? req.body.order : [];
  if (!rawOrder.length) {
    return res.status(400).json({ error: 'order must be a non-empty array' });
  }

  const ownedEvent = await resolveOwnedEventFromRequest(req, eventId);
  if (!ownedEvent.ok) {
    return res.status(ownedEvent.status).json({ error: ownedEvent.error });
  }

  const storageRoot = getEventStorageRoot(ownedEvent.event, eventId);
  const storage = ownedEvent.supabase.storage.from('event-media');
  const entries = await loadGalleryEntries(storage, storageRoot);
  const existingNames = entries.map((entry) => entry.name);
  const existingNameSet = new Set(existingNames);

  const requestedNames = rawOrder
    .map((value) => extractGalleryFileName(value))
    .filter((name, index, array) => Boolean(name) && array.indexOf(name) === index && existingNameSet.has(name));

  const finalNames = [
    ...requestedNames,
    ...existingNames.filter((name) => !requestedNames.includes(name)),
  ];

  const renamePairs = finalNames.map((currentName, index) => ({
    from: currentName,
    to: toOrderedFileName(currentName, index),
  }));

  const tempPrefix = `__tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tempPairs = renamePairs
    .filter((pair) => pair.from !== pair.to)
    .map((pair, index) => ({
      ...pair,
      temp: `${tempPrefix}-${String(index + 1).padStart(3, '0')}-${pair.from}`,
    }));

  for (const pair of tempPairs) {
    const { error } = await storage.move(
      `${storageRoot}/gallery/${pair.from}`,
      `${storageRoot}/gallery/${pair.temp}`,
    );
    if (error) {
      throw error;
    }
  }

  for (const pair of tempPairs) {
    const { error } = await storage.move(
      `${storageRoot}/gallery/${pair.temp}`,
      `${storageRoot}/gallery/${pair.to}`,
    );
    if (error) {
      throw error;
    }
  }

  const refreshedEntries = await loadGalleryEntries(storage, storageRoot);
  const items = buildGalleryResponseItems(storage, storageRoot, refreshedEntries);

  return res.status(200).json({
    eventId: ownedEvent.event.id,
    storageRoot,
    items,
  });
}

async function handleSongsList(req, res, eventId) {
  if (!eventId) {
    return res.status(400).json({ error: 'eventId required' });
  }

  const ownedEvent = await resolveOwnedEventFromRequest(req, eventId);
  if (!ownedEvent.ok) {
    return res.status(ownedEvent.status).json({ error: ownedEvent.error });
  }

  const storage = ownedEvent.supabase.storage.from('event-media');
  const { data, error } = await storage.list('songs', {
    limit: 200,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    throw error;
  }

  const files = (Array.isArray(data) ? data : [])
    .filter((entry) => Boolean(entry?.name) && AUDIO_EXTENSION_PATTERN.test(entry.name))
    .map((entry) => {
      const { data: urlData } = storage.getPublicUrl(`songs/${entry.name}`);
      return {
        name: entry.name,
        url: urlData?.publicUrl || '',
      };
    });

  return res.status(200).json({ files });
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (req.method === 'GET') {
      const eventId = getSingleValue(req.query?.eventId);
      const type = getSingleValue(req.query?.type || 'gallery');
      if (type === 'songs') {
        return handleSongsList(req, res, eventId);
      }
      if (type !== 'gallery') {
        return res.status(400).json({ error: 'type must be gallery or songs' });
      }
      return handleGalleryList(req, res, eventId);
    }

    if (req.method === 'PATCH') {
      const type = getSingleValue(req.body?.type || 'gallery');
      if (type !== 'gallery') {
        return res.status(400).json({ error: 'type must be gallery' });
      }
      return handleGalleryReorder(req, res);
    }

    if (req.method === 'DELETE') {
      const type = getSingleValue(req.body?.type || req.query?.type || 'gallery');
      if (type !== 'gallery') {
        return res.status(400).json({ error: 'type must be gallery' });
      }
      return handleGalleryDelete(req, res);
    }

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

    // Verificar limite de galeria por plano
    if (type === 'gallery') {
      const plan = await getUserPlan(ownedEvent.supabase, ownedEvent.user.id);
      const limit = plan === 'premium' ? GALLERY_LIMIT_PREMIUM : GALLERY_LIMIT_FREE;
      const storageRootCheck = getEventStorageRoot(ownedEvent.event, eventId);
      const storage = ownedEvent.supabase.storage.from('event-media');
      const existing = await loadGalleryEntries(storage, storageRootCheck);
      if (existing.length >= limit) {
        return res.status(403).json({
          error: `Limite de ${limit} ${plan === 'premium' ? '' : '(plano free) '}fotos na galeria atingido.`,
          upgrade_required: plan !== 'premium',
        });
      }
    }

    let buffer = await readFile(file.filepath);
    const storageRoot = getEventStorageRoot(ownedEvent.event, eventId);
    let storagePath = buildStoragePath(storageRoot, type, file);
    let contentType = file.mimetype;

    if (type === 'hero') {
      buffer = await normalizeHeroImageBuffer(buffer);
      storagePath = `${storageRoot}/hero/hero.jpg`;
      contentType = 'image/jpeg';
    }

    const storage = ownedEvent.supabase.storage.from('event-media');

    const { error: uploadError } = await storage.upload(storagePath, buffer, {
      contentType,
      upsert: type === 'hero' || type === 'pix-qr',
    });

    if (uploadError) {
      throw uploadError;
    }

    // After a successful upload, remove any other files in the same folder
    // (e.g. old hero.jpg when the new upload is hero.webp). Non-blocking.
    if (type === 'hero' || type === 'pix-qr') {
      const folderPrefix = type === 'hero' ? `${storageRoot}/hero` : `${storageRoot}/pix`;
      const newFileName = storagePath.replace(`${folderPrefix}/`, '');
      await removeOtherFilesInFolder(storage, folderPrefix, newFileName);
    }

    const { data } = storage.getPublicUrl(storagePath);

    return res.status(200).json({
      eventId,
      path: storagePath,
      type,
      url: data?.publicUrl || '',
      name: sanitizeGalleryFileName(storagePath),
    });
  } catch (error) {
    if (isFileTooLargeError(error)) {
      return res.status(413).json({ error: 'Arquivo excede o limite de 10 MB.' });
    }

    console.error('[dashboard/media] Failed to process media request', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
