function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)])
  );
}

export function mergeDeep(base, override) {
  const baseObject = isPlainObject(base) ? base : {};
  const overrideObject = isPlainObject(override) ? override : {};
  const result = cloneValue(baseObject);

  Object.entries(overrideObject).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (isPlainObject(result[key]) && isPlainObject(value)) {
      result[key] = mergeDeep(result[key], value);
      return;
    }

    result[key] = cloneValue(value);
  });

  return result;
}

function normalizeTimeValue(value) {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim();

  if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.slice(0, 5);
  }

  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  return normalized;
}

function buildEventDateTimeString(eventDate, eventTime, fallbackValue) {
  if (fallbackValue) {
    return fallbackValue;
  }

  if (!eventDate) {
    return undefined;
  }

  const normalizedDate = String(eventDate).trim();
  const normalizedTime = normalizeTimeValue(eventTime);

  if (!normalizedTime) {
    return `${normalizedDate}T00:00:00`;
  }

  return `${normalizedDate}T${normalizedTime}:00`;
}

function setIfDefined(target, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    target[key] = value;
  }
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function normalizeRsvpConfig(rsvpConfig = {}, eventSlug = '') {
  const nextRsvp = isPlainObject(rsvpConfig) ? cloneValue(rsvpConfig) : {};

  const normalizedEventId = firstDefined(nextRsvp.eventId, nextRsvp.event_id, eventSlug);
  const normalizedSupabaseEnabled = firstDefined(nextRsvp.supabaseEnabled, nextRsvp.supabase_enabled);

  setIfDefined(nextRsvp, 'eventId', normalizedEventId);
  if (normalizedSupabaseEnabled !== undefined) {
    nextRsvp.supabaseEnabled = Boolean(normalizedSupabaseEnabled);
  }

  if ('event_id' in nextRsvp) {
    delete nextRsvp.event_id;
  }
  if ('supabase_enabled' in nextRsvp) {
    delete nextRsvp.supabase_enabled;
  }

  return nextRsvp;
}

function normalizeWhatsappConfig(whatsappConfig = {}) {
  const nextWhatsapp = isPlainObject(whatsappConfig) ? cloneValue(whatsappConfig) : {};

  setIfDefined(
    nextWhatsapp,
    'destinationPhone',
    firstDefined(nextWhatsapp.destinationPhone, nextWhatsapp.destination_phone)
  );
  setIfDefined(
    nextWhatsapp,
    'recipientName',
    firstDefined(nextWhatsapp.recipientName, nextWhatsapp.recipient_name)
  );
  setIfDefined(
    nextWhatsapp,
    'redirectDelayMs',
    firstDefined(nextWhatsapp.redirectDelayMs, nextWhatsapp.redirect_delay_ms)
  );

  if ('destination_phone' in nextWhatsapp) {
    delete nextWhatsapp.destination_phone;
  }
  if ('recipient_name' in nextWhatsapp) {
    delete nextWhatsapp.recipient_name;
  }
  if ('redirect_delay_ms' in nextWhatsapp) {
    delete nextWhatsapp.redirect_delay_ms;
  }

  return nextWhatsapp;
}

function resolveCatalogKey(config, index) {
  const rawKey = config?.key || config?.id || config?.slug || config?.title || `catalog-${index + 1}`;

  return String(rawKey)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function mapGiftConfig(giftRecords, baseGiftConfig) {
  const gift = isPlainObject(baseGiftConfig) ? cloneValue(baseGiftConfig) : {};
  const catalogLists = isPlainObject(gift.catalogs?.lists) ? cloneValue(gift.catalogs.lists) : {};
  const catalogs = Array.isArray(giftRecords)
    ? [...giftRecords].sort((left, right) => (left?.sort_order ?? 0) - (right?.sort_order ?? 0))
    : [];

  catalogs.forEach((giftRecord, index) => {
    const config = isPlainObject(giftRecord?.config) ? giftRecord.config : {};

    if (giftRecord?.type === 'pix') {
      Object.assign(gift, mergeDeep(gift, config));
      gift.pixEnabled = Boolean(giftRecord.enabled);
      return;
    }

    if (giftRecord?.type === 'card') {
      Object.assign(gift, mergeDeep(gift, config));
      gift.cardPaymentEnabled = Boolean(giftRecord.enabled);
      return;
    }

    if (giftRecord?.type === 'catalog') {
      const catalogKey = resolveCatalogKey(config, index);
      catalogLists[catalogKey] = mergeDeep(config, { enabled: Boolean(giftRecord.enabled) });
    }
  });

  const catalogKeys = Object.keys(catalogLists);

  if (!catalogKeys.length) {
    return gift;
  }

  const preferredActiveKey = gift.catalogs?.activeKey || gift.activeCatalogKey;
  const firstEnabledKey = catalogKeys.find((key) => catalogLists[key]?.enabled !== false);
  const activeKey = catalogLists[preferredActiveKey]
    ? preferredActiveKey
    : (firstEnabledKey || catalogKeys[0]);

  gift.catalogs = mergeDeep(gift.catalogs, {
    activeKey,
    lists: catalogLists,
  });
  gift.activeCatalogKey = activeKey;
  gift.catalog = mergeDeep(gift.catalog, catalogLists[activeKey]);

  return gift;
}

const GALLERY_IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp)$/i;

function buildGalleryAltFromName(fileName, index) {
  const fallback = `Foto ${index + 1}`;
  const raw = String(fileName || '').trim();

  if (!raw) {
    return fallback;
  }

  const withoutExtension = raw.replace(/\.[^.]+$/, '');
  const withoutTimestampPrefix = withoutExtension.replace(/^\d+-/, '');
  const normalized = withoutTimestampPrefix
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export async function resolveEventGalleryFromStorage(supabase, eventId) {
  const normalizedEventId = String(eventId || '').trim();

  if (!supabase || !normalizedEventId) {
    return [];
  }

  const storage = supabase.storage.from('event-media');
  const { data, error } = await storage.list(`${normalizedEventId}/gallery`, {
    limit: 200,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.warn('[event-config] Failed to list gallery from Storage', error);
    return [];
  }

  const imageEntries = (Array.isArray(data) ? data : [])
    .filter((entry) => {
      const name = String(entry?.name || '').trim();
      return Boolean(name) && GALLERY_IMAGE_EXTENSION_PATTERN.test(name);
    });

  return imageEntries.map((entry, index) => {
    const fileName = String(entry.name || '').trim();
    const path = `${normalizedEventId}/gallery/${fileName}`;
    const { data: publicUrlData } = storage.getPublicUrl(path);

    return {
      src: publicUrlData?.publicUrl || '',
      alt: buildGalleryAltFromName(fileName, index),
    };
  }).filter((image) => Boolean(image.src));
}

export function applyGalleryToHistoriaConfig(config, galleryImages) {
  const nextConfig = isPlainObject(config) ? cloneValue(config) : {};

  if (!nextConfig.pages) nextConfig.pages = {};
  if (!nextConfig.pages.historia) nextConfig.pages.historia = {};
  if (!nextConfig.pages.historia.content) nextConfig.pages.historia.content = {};

  nextConfig.pages.historia.content.gallery = Array.isArray(galleryImages)
    ? galleryImages.map((image) => ({ src: image?.src || '', alt: image?.alt || '' }))
    : [];

  return nextConfig;
}

export function stripHistoriaGalleryFromConfig(config) {
  const nextConfig = isPlainObject(config) ? cloneValue(config) : {};

  if (nextConfig.pages?.historia?.content && 'gallery' in nextConfig.pages.historia.content) {
    delete nextConfig.pages.historia.content.gallery;
  }

  return nextConfig;
}

export function buildEventConfigResponse(eventRecord) {
  const sourceConfig = isPlainObject(eventRecord?.config) ? cloneValue(eventRecord.config) : {};
  const nextConfig = mergeDeep(sourceConfig, {});

  setIfDefined(nextConfig, 'activeTheme', eventRecord?.active_theme);
  setIfDefined(nextConfig, 'activeLayout', eventRecord?.active_layout);

  nextConfig.couple = mergeDeep(nextConfig.couple, {});
  setIfDefined(nextConfig.couple, 'names', eventRecord?.couple_names);
  setIfDefined(nextConfig.couple, 'brideName', eventRecord?.bride_name);
  setIfDefined(nextConfig.couple, 'groomName', eventRecord?.groom_name);

  nextConfig.event = mergeDeep(nextConfig.event, {});
  setIfDefined(
    nextConfig.event,
    'date',
    buildEventDateTimeString(eventRecord?.event_date, eventRecord?.event_time, nextConfig.event?.date)
  );
  setIfDefined(nextConfig.event, 'time', normalizeTimeValue(eventRecord?.event_time) || nextConfig.event?.time);
  setIfDefined(nextConfig.event, 'locationName', eventRecord?.venue_name);
  setIfDefined(nextConfig.event, 'venueAddress', eventRecord?.venue_address);
  setIfDefined(nextConfig.event, 'mapsLink', eventRecord?.venue_maps_link);

  nextConfig.rsvp = normalizeRsvpConfig(nextConfig.rsvp, eventRecord?.slug);
  nextConfig.whatsapp = normalizeWhatsappConfig(nextConfig.whatsapp);

  nextConfig.gift = mapGiftConfig(eventRecord?.event_gifts, nextConfig.gift);

  return nextConfig;
}