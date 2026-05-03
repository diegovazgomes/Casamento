import {
  applyGalleryToHistoriaConfig,
  buildEventConfigResponse,
  mergeDeep,
  resolveEventGalleryFromStorage,
  stripHistoriaGalleryFromConfig,
} from '../_lib/event-config.js';
import {
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

/**
 * Extrai campos que vão direto na tabela events a partir do config completo
 */
function extractEventTableFields(config) {
  const fields = {};

  // Casal
  if (config?.couple?.names) {
    fields.couple_names = config.couple.names;
  }
  if (config?.couple?.bride_name) {
    fields.bride_name = config.couple.bride_name;
  }
  if (config?.couple?.groom_name) {
    fields.groom_name = config.couple.groom_name;
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

  // Local
  if (config?.event?.locationName) {
    fields.venue_name = config.event.locationName;
  }
  if (config?.event?.venueAddress) {
    fields.venue_address = config.event.venueAddress;
  }
  if (config?.event?.mapsLink) {
    fields.venue_maps_link = config.event.mapsLink;
  }
  if (config?.event?.venueCoordinates) {
    fields.venue_coordinates = config.event.venueCoordinates;
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
        allowFallbackOwnedEvent: true,
        selectClause: `${EVENT_RESPONSE_SELECT},event_gifts(id,type,enabled,sort_order,config)`,
      });

      if (!ownedEvent.ok) {
        return res.status(ownedEvent.status).json({ error: ownedEvent.error });
      }

      const mappedConfig = buildEventConfigResponse(ownedEvent.event);
      const galleryImages = await resolveEventGalleryFromStorage(ownedEvent.supabase, ownedEvent.event.id);
      const finalConfig = applyGalleryToHistoriaConfig(mappedConfig, galleryImages);

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
    const { eventId, slug, ...body } = req.body || {};

    const ownedEvent = await requireOwnedEvent(req, {
      lookup,
      selectClause: 'id,user_id,config,slug',
    });

    if (!ownedEvent.ok) {
      return res.status(ownedEvent.status).json({ error: ownedEvent.error });
    }

    // Validar que config foi enviado
    if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
      return res.status(400).json({ error: 'config must be a valid object' });
    }

    const sanitizedIncomingConfig = stripHistoriaGalleryFromConfig(body.config);

    console.log('[dashboard/event] PATCH received:', {
      eventId: ownedEvent.event.id,
      slug: ownedEvent.event.slug,
      configKeys: Object.keys(sanitizedIncomingConfig),
    });

    // 1. Extrair campos que vão direto na tabela
    const tableFields = extractEventTableFields(sanitizedIncomingConfig);

    // 2. Fazer merge profundo do config com o existente
    const existingConfig = ownedEvent.event.config || {};
    const newConfig = mergeDeep(existingConfig, sanitizedIncomingConfig);

    // 3. Montar payload de update
    const updateData = {
      ...tableFields,
      config: newConfig,
    };

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
    const galleryImages = await resolveEventGalleryFromStorage(ownedEvent.supabase, data.id);
    const finalConfig = applyGalleryToHistoriaConfig(mappedConfig, galleryImages);

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
    return res.status(500).json({ error: 'Internal server error' });
  }
}