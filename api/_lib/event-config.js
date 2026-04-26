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

  nextConfig.rsvp = mergeDeep(nextConfig.rsvp, {});
  setIfDefined(nextConfig.rsvp, 'eventId', nextConfig.rsvp?.eventId || eventRecord?.slug);

  nextConfig.gift = mapGiftConfig(eventRecord?.event_gifts, nextConfig.gift);

  return nextConfig;
}