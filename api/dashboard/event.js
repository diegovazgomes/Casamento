import {
  applyPixQrToGiftConfig,
  applyGalleryToHistoriaConfig,
  buildEventConfigResponse,
  mergeDeep,
  resolveEventGalleryFromStorage,
  resolveEventPixQrFromStorage,
  stripHistoriaGalleryFromConfig,
} from '../_lib/event-config.js';
import {
  getDashboardEventLookup,
  getUserPlan,
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
  'ceremony_name',
  'ceremony_address',
  'ceremony_maps_link',
  'ceremony_coordinates',
  'party_name',
  'party_address',
  'party_maps_link',
  'party_coordinates',
  'venue_name',
  'venue_address',
  'venue_maps_link',
  'active_theme',
  'active_layout',
  'is_active',
  'config',
  'updated_at',
].join(',');

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function validateSlugCandidate(value) {
  const normalized = slugify(value || '');

  if (!normalized) {
    return { ok: false, error: 'slug must be a valid non-empty string' };
  }

  if (normalized.length < 3 || normalized.length > 60) {
    return { ok: false, error: 'slug must have between 3 and 60 characters' };
  }

  return { ok: true, slug: normalized };
}

function splitCoupleNames(value) {
  const source = String(value || '').trim();
  if (!source) {
    return { brideName: '', groomName: '' };
  }

  const separators = [' & ', ' e ', ' + ', '&', '+'];
  const foundSeparator = separators.find((separator) => source.includes(separator));
  if (!foundSeparator) {
    return { brideName: source, groomName: '' };
  }

  const parts = source
    .split(foundSeparator)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    brideName: parts[0] || '',
    groomName: parts[1] || '',
  };
}

function normalizeDateToDayMonthYear(value) {
  const source = String(value || '').trim();
  if (!source) {
    return '';
  }

  const dateOnly = source.includes('T') ? source.split('T')[0] : source;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return '';
  }

  const [year, month, day] = dateOnly.split('-');
  return `${day}-${month}-${year}`;
}

function resolveEventSlugParts(config = {}, existingConfig = {}) {
  const incomingCouple = config?.couple || {};
  const existingCouple = existingConfig?.couple || {};
  const parsedNames = splitCoupleNames(incomingCouple.names || existingCouple.names);

  const brideName = incomingCouple.bride_name
    || incomingCouple.brideName
    || existingCouple.bride_name
    || existingCouple.brideName
    || parsedNames.brideName
    || 'noiva';

  const groomName = incomingCouple.groom_name
    || incomingCouple.groomName
    || existingCouple.groom_name
    || existingCouple.groomName
    || parsedNames.groomName
    || 'noivo';

  const dateValue = config?.event?.date
    || existingConfig?.event?.date
    || '';
  const datePart = normalizeDateToDayMonthYear(dateValue) || 'dd-mm-aaaa';

  return {
    brideSlug: slugify(brideName) || 'noiva',
    groomSlug: slugify(groomName) || 'noivo',
    datePart,
  };
}

function buildAutoEventSlug(config = {}, existingConfig = {}) {
  const parts = resolveEventSlugParts(config, existingConfig);
  return slugify(`${parts.brideSlug}-${parts.groomSlug}-${parts.datePart}`);
}

async function ensureUniqueEventSlug(supabase, baseSlug, currentEventId) {
  const normalizedBase = slugify(baseSlug) || 'casal-noivos';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || data.id === currentEventId) {
      return candidate;
    }
  }

  return `${normalizedBase}-${Date.now().toString(36)}`;
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'];

function deriveDateLabels(dateOnly) {
  const parsed = new Date(`${dateOnly}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return {
      heroDate: '',
      detailDate: '',
      displayDate: '',
      weekday: '',
    };
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const monthIndex = parsed.getMonth();
  const monthNumber = String(monthIndex + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return {
    heroDate: `${day} . ${monthNumber} . ${year}`,
    detailDate: `${day} ${MONTHS_SHORT[monthIndex]} ${year}`,
    displayDate: `${day} de ${MONTHS_FULL[monthIndex]} de ${year}`,
    weekday: WEEKDAYS[parsed.getDay()],
  };
}

function buildInitialEventConfig({ coupleName, slug, whatsapp }) {
  const eventDate = new Date().toISOString().slice(0, 10);
  const dateLabels = deriveDateLabels(eventDate);

  return {
    activeTheme: 'classic-gold',
    activeLayout: 'classic',
    couple: {
      names: coupleName || 'Novo Casal',
    },
    event: {
      date: `${eventDate}T17:00:00-03:00`,
      heroDate: dateLabels.heroDate,
      detailDate: dateLabels.detailDate,
      displayDate: dateLabels.displayDate,
      weekday: dateLabels.weekday,
      time: '17:00',
      ceremonyLocationName: 'Definir local da cerimônia',
      ceremonyLocationCity: '',
      ceremonyAddress: 'Definir endereço da cerimônia',
      ceremonyMapsLink: '',
      partyLocationName: 'Definir local da festa',
      partyLocationCity: '',
      partyAddress: 'Definir endereço da festa',
      partyMapsLink: '',
    },
    rsvp: {
      eventId: slug,
      supabaseEnabled: true,
    },
    whatsapp: {
      destinationPhone: whatsapp || '',
    },
    gift: {
      pixEnabled: false,
      cardPaymentEnabled: false,
    },
  };
}

function buildInitialEventTableFields() {
  return {
    event_date: new Date().toISOString().slice(0, 10),
    event_time: '17:00',
    ceremony_name: 'Definir local da cerimônia',
    ceremony_address: 'Definir endereço da cerimônia',
    ceremony_maps_link: '',
    party_name: 'Definir local da festa',
    party_address: 'Definir endereço da festa',
    party_maps_link: '',
    venue_name: 'Definir local da festa',
    venue_address: 'Definir endereço da festa',
    venue_maps_link: '',
  };
}

async function seedDefaultEventGifts(supabase, eventId) {
  if (!eventId) {
    return;
  }

  try {
    const { data: existingRows, error: existingRowsError } = await supabase
      .from('event_gifts')
      .select('type')
      .eq('event_id', eventId);

    if (existingRowsError) {
      throw existingRowsError;
    }

    const existingTypes = new Set((existingRows || []).map((row) => String(row?.type || '')));
    const rowsToInsert = [];

    if (!existingTypes.has('pix')) {
      rowsToInsert.push({
        event_id: eventId,
        type: 'pix',
        enabled: false,
        sort_order: 1,
        config: {},
      });
    }

    if (!existingTypes.has('card')) {
      rowsToInsert.push({
        event_id: eventId,
        type: 'card',
        enabled: false,
        sort_order: 2,
        config: {},
      });
    }

    if (!rowsToInsert.length) {
      return;
    }

    const { error: insertError } = await supabase
      .from('event_gifts')
      .insert(rowsToInsert);

    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.warn('[dashboard/event] Falha ao criar presentes padrão do evento:', error?.message || error);
  }
}

/**
 * Extrai campos que vão direto na tabela events a partir do config completo
 */
function extractEventTableFields(config) {
  const fields = {};
  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

  // Casal
  if (hasOwn(config?.couple, 'names')) {
    fields.couple_names = config.couple.names;
  }
  if (hasOwn(config?.couple, 'bride_name')) {
    fields.bride_name = config.couple.bride_name;
  } else if (hasOwn(config?.couple, 'brideName')) {
    fields.bride_name = config.couple.brideName;
  }
  if (hasOwn(config?.couple, 'groom_name')) {
    fields.groom_name = config.couple.groom_name;
  } else if (hasOwn(config?.couple, 'groomName')) {
    fields.groom_name = config.couple.groomName;
  }

  // Evento
  if (config?.event?.date) {
    // Converte ISO 8601 para DATE (YYYY-MM-DD)
    const dateStr = config.event.date;
    const datePart = dateStr.split('T')[0]; // Pega só a parte da data
    if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      fields.event_date = datePart;
    }
  }
  if (config?.event?.time) {
    fields.event_time = config.event.time;
  }

  // Local (cerimônia + festa)
  const ceremonyName = config?.event?.ceremonyLocationName;
  const ceremonyAddress = config?.event?.ceremonyAddress;
  const ceremonyMapsLink = config?.event?.ceremonyMapsLink;
  const ceremonyCoordinates = config?.event?.ceremonyCoordinates;

  const partyName = config?.event?.partyLocationName || config?.event?.locationName;
  const partyAddress = config?.event?.partyAddress || config?.event?.venueAddress;
  const partyMapsLink = config?.event?.partyMapsLink || config?.event?.mapsLink;
  const partyCoordinates = config?.event?.partyCoordinates || config?.event?.venueCoordinates;

  if (ceremonyName) {
    fields.ceremony_name = ceremonyName;
  }
  if (ceremonyAddress) {
    fields.ceremony_address = ceremonyAddress;
  }
  if (ceremonyMapsLink) {
    fields.ceremony_maps_link = ceremonyMapsLink;
  }
  if (ceremonyCoordinates) {
    fields.ceremony_coordinates = ceremonyCoordinates;
  }

  if (partyName) {
    fields.party_name = partyName;
    fields.venue_name = partyName;
  }
  if (partyAddress) {
    fields.party_address = partyAddress;
    fields.venue_address = partyAddress;
  }
  if (partyMapsLink) {
    fields.party_maps_link = partyMapsLink;
    fields.venue_maps_link = partyMapsLink;
  }
  if (partyCoordinates) {
    fields.party_coordinates = partyCoordinates;
    fields.venue_coordinates = partyCoordinates;
  }

  // Tema e Layout
  if (config?.activeTheme) {
    fields.active_theme = config.activeTheme;
  }
  if (config?.activeLayout) {
    fields.active_layout = config.activeLayout;
  }

  return fields;
}

function injectAffiliateTag(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    if (u.hostname.includes('amazon.com') || u.hostname.includes('amzn.to')) {
      u.searchParams.set('tag', 'casamentoafiliad-20');
    } else if (u.hostname.includes('magalu.com') || u.hostname.includes('magazineluiza.com')) {
      u.searchParams.set('utm_source', 'casamento_afiliado');
    }
    return u.toString();
  } catch { return url; }
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://devazi.app');
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
      let ownedEvent = await requireOwnedEvent(req, {
        allowFallbackOwnedEvent: true,
        selectClause: `${EVENT_RESPONSE_SELECT},event_gifts(id,type,enabled,sort_order,config)`,
      });

      if (!ownedEvent.ok) {
        return res.status(ownedEvent.status).json({ error: ownedEvent.error });
      }

      const mappedConfig = buildEventConfigResponse(ownedEvent.event);
      const galleryImages = await resolveEventGalleryFromStorage(ownedEvent.supabase, ownedEvent.event.id, ownedEvent.event.slug);
      const pixQrUrl = await resolveEventPixQrFromStorage(ownedEvent.supabase, ownedEvent.event.id, ownedEvent.event.slug);
      const withPixQr = applyPixQrToGiftConfig(mappedConfig, pixQrUrl);
      const finalConfig = applyGalleryToHistoriaConfig(withPixQr, galleryImages);

      return res.status(200).json({
        event: {
          id: ownedEvent.event.id,
          slug: ownedEvent.event.slug,
          user_id: ownedEvent.event.user_id,
          active_theme: ownedEvent.event.active_theme,
          active_layout: ownedEvent.event.active_layout,
          updated_at: ownedEvent.event.updated_at,
        },
        config: finalConfig,
      });
    }

    // ===== PATCH: Atualizar evento =====
    const lookup = getDashboardEventLookup(req);
    const { eventId, ...body } = req.body || {};

    const ownedEvent = await requireOwnedEvent(req, {
      lookup,
      allowFallbackOwnedEvent: true,
      selectClause: 'id,user_id,config,slug',
    });

    if (!ownedEvent.ok) {
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    // Validar que config foi enviado
    if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
      return res.status(400).json({ error: 'config must be a valid object' });
    }

    let sanitizedIncomingConfig = stripHistoriaGalleryFromConfig(body.config);
    const existingConfig = ownedEvent.event.config || {};

    // Bloquear configuração de áudio para plano free
    const plan = await getUserPlan(ownedEvent.supabase, ownedEvent.user.id);
    if (plan !== 'premium' && sanitizedIncomingConfig.media?.tracks) {
      const { tracks: _stripped, ...mediaWithoutTracks } = sanitizedIncomingConfig.media;
      sanitizedIncomingConfig = {
        ...sanitizedIncomingConfig,
        media: mediaWithoutTracks,
      };
    }
    const shouldAutoGenerateSlug = body.autoGenerateSlug === true;

    let normalizedIncomingSlug = null;

    if (hasOwn(body, 'slug') && body.slug) {
      const slugValidation = validateSlugCandidate(body.slug);

      if (!slugValidation.ok) {
        return res.status(400).json({ error: slugValidation.error });
      }

      normalizedIncomingSlug = slugValidation.slug;

      if (normalizedIncomingSlug !== ownedEvent.event.slug) {
        const { data: conflictingSlugRow, error: conflictingSlugError } = await ownedEvent.supabase
          .from('events')
          .select('id')
          .eq('slug', normalizedIncomingSlug)
          .maybeSingle();

        if (conflictingSlugError) {
          throw conflictingSlugError;
        }

        if (conflictingSlugRow && conflictingSlugRow.id !== ownedEvent.event.id) {
          return res.status(409).json({ error: 'slug already in use' });
        }
      }
    }

    if (shouldAutoGenerateSlug) {
      const generatedSlug = buildAutoEventSlug(sanitizedIncomingConfig, existingConfig);
      normalizedIncomingSlug = await ensureUniqueEventSlug(
        ownedEvent.supabase,
        generatedSlug,
        ownedEvent.event.id,
      );
    }

    console.log('[dashboard/event] PATCH received:', {
      eventId: ownedEvent.event.id,
      slug: ownedEvent.event.slug,
      configKeys: Object.keys(sanitizedIncomingConfig),
    });

    // 1. Extrair campos que vão direto na tabela
    const tableFields = extractEventTableFields(sanitizedIncomingConfig);

    // 2. Fazer merge profundo do config com o existente
    const newConfig = mergeDeep(existingConfig, sanitizedIncomingConfig);

    if (normalizedIncomingSlug) {
      newConfig.rsvp = mergeDeep(newConfig.rsvp, { eventId: normalizedIncomingSlug });
    }

    // 3. Montar payload de update
    const updateData = {
      ...tableFields,
      config: newConfig,
    };

    if (normalizedIncomingSlug) {
      updateData.slug = normalizedIncomingSlug;
    }

    console.log('[dashboard/event] Update payload:', {
      tableFields: Object.keys(tableFields),
      configSize: JSON.stringify(newConfig).length,
    });

    // 4. Executar update
    const { data, error: updateError } = await ownedEvent.supabase
      .from('events')
      .update(updateData)
      .eq('id', ownedEvent.event.id)
      .eq('user_id', ownedEvent.user.id)
      .select(EVENT_RESPONSE_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error('[dashboard/event] Update failed:', updateError);
      throw updateError;
    }

    if (!data) {
      return res.status(404).json({ error: 'Evento não encontrado ou sem permissão' });
    }

    console.log('[dashboard/event] Update success:', {
      eventId: data.id,
      updatedAt: data.updated_at,
    });

    // 4b. Sincronizar event_gifts.enabled para pix e card
    //     O config JSONB guarda pixEnabled/cardPaymentEnabled, mas
    //     mapGiftConfig sobrescreve esses valores com event_gifts.enabled.
    //     Por isso é preciso manter os dois em sincronia.
    const incomingGift = sanitizedIncomingConfig.gift || {};
    const giftSyncs = [];

    if ('pixEnabled' in incomingGift) {
      giftSyncs.push({ type: 'pix', enabled: Boolean(incomingGift.pixEnabled) });
    }
    if ('cardPaymentEnabled' in incomingGift) {
      giftSyncs.push({ type: 'card', enabled: Boolean(incomingGift.cardPaymentEnabled) });
    }

    for (const sync of giftSyncs) {
      const { error: giftUpdateError } = await ownedEvent.supabase
        .from('event_gifts')
        .update({ enabled: sync.enabled })
        .eq('event_id', ownedEvent.event.id)
        .eq('type', sync.type);

      if (giftUpdateError) {
        console.warn(
          `[dashboard/event] Falha ao sincronizar event_gifts.enabled type=${sync.type}:`,
          giftUpdateError,
        );
      } else {
        console.log(`[dashboard/event] event_gifts.enabled synced: type=${sync.type} enabled=${sync.enabled}`);
      }
    }

    // 4c. Sincronizar event_gifts.config para catalog (itens editados no dashboard)
    if (incomingGift.catalog?.key) {
      const catalogKey = incomingGift.catalog.key;
      const catalogConfig = {
        key:      catalogKey,
        title:    incomingGift.catalog.title    ?? '',
        subtitle: incomingGift.catalog.subtitle ?? '',
        items:    Array.isArray(incomingGift.catalog.items) ? incomingGift.catalog.items : [],
      };

      // Busca o id da linha do catálogo ativo para atualizar apenas ela
      try {
        const { data: catalogRows, error: fetchErr } = await ownedEvent.supabase
          .from('event_gifts')
          .select('id, config')
          .eq('event_id', ownedEvent.event.id)
          .eq('type', 'catalog');

        if (fetchErr) {
          console.warn('[dashboard/event] Falha ao buscar event_gifts catalog:', fetchErr);
        } else {
          const targetRow = (catalogRows || []).find(r => r.config?.key === catalogKey);
          if (targetRow) {
            const updatedConfig = Object.assign({}, targetRow.config, catalogConfig);
            const { error: updateErr } = await ownedEvent.supabase
              .from('event_gifts')
              .update({ config: updatedConfig })
              .eq('id', targetRow.id);

            if (updateErr) {
              console.warn('[dashboard/event] Falha ao atualizar config do catalog:', updateErr);
            } else {
              console.log(`[dashboard/event] event_gifts.config synced: catalog key=${catalogKey}`);
            }
          } else {
            console.warn(`[dashboard/event] Nenhuma linha event_gifts com type=catalog key=${catalogKey} encontrada.`);
          }
        }
      } catch (catalogErr) {
        console.warn('[dashboard/event] Erro inesperado ao sincronizar catalog config:', catalogErr);
      }
    }


    // 4d. Sincronizar event_gifts para type='external'
    if (incomingGift.external !== undefined) {
      const extData = incomingGift.external || {};
      if (extData.enabled && extData.url) {
        const { error: extUpsertError } = await ownedEvent.supabase
          .from('event_gifts')
          .upsert(
            {
              event_id: ownedEvent.event.id,
              type: 'external',
              enabled: true,
              config: {
                url:   injectAffiliateTag(extData.url),
                label: extData.label || 'Ver lista completa',
                store: extData.store || '',
              },
            },
            { onConflict: 'event_id,type' },
          );

        if (extUpsertError) {
          console.warn('[dashboard/event] Falha ao upsert event_gifts external:', extUpsertError);
        } else {
          console.log('[dashboard/event] event_gifts.external upserted:', extData.url);
        }
      } else {
        const { error: extDeleteError } = await ownedEvent.supabase
          .from('event_gifts')
          .delete()
          .match({ event_id: ownedEvent.event.id, type: 'external' });

        if (extDeleteError) {
          console.warn('[dashboard/event] Falha ao deletar event_gifts external:', extDeleteError);
        } else {
          console.log('[dashboard/event] event_gifts.external deleted (disabled or no url)');
        }
      }
    }

    const mappedConfig = buildEventConfigResponse(data);
    const galleryImages = await resolveEventGalleryFromStorage(ownedEvent.supabase, data.id, data.slug);
    const pixQrUrl = await resolveEventPixQrFromStorage(ownedEvent.supabase, data.id, data.slug);
    const withPixQr = applyPixQrToGiftConfig(mappedConfig, pixQrUrl);
    const finalConfig = applyGalleryToHistoriaConfig(withPixQr, galleryImages);

    return res.status(200).json({
      event: {
        id: data.id,
        slug: data.slug,
        user_id: data.user_id,
        couple_names: data.couple_names,
        bride_name: data.bride_name,
        groom_name: data.groom_name,
        event_date: data.event_date,
        event_time: data.event_time,
        ceremony_name: data.ceremony_name,
        ceremony_address: data.ceremony_address,
        ceremony_maps_link: data.ceremony_maps_link,
        ceremony_coordinates: data.ceremony_coordinates,
        party_name: data.party_name,
        party_address: data.party_address,
        party_maps_link: data.party_maps_link,
        party_coordinates: data.party_coordinates,
        venue_name: data.venue_name,
        venue_address: data.venue_address,
        venue_maps_link: data.venue_maps_link,
        active_theme: data.active_theme,
        active_layout: data.active_layout,
        updated_at: data.updated_at,
      },
      config: finalConfig,
    });
  } catch (error) {
    console.error('[dashboard/event] Failed to update event', error);
    return res.status(500).json({
      error: error?.message || error?.code || 'Internal server error',
    });
  }
}