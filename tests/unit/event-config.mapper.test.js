import { describe, expect, it } from 'vitest';

import { buildEventConfigResponse } from '../../api/_lib/event-config.js';

describe('buildEventConfigResponse', () => {
  it('merges explicit event fields with config json and normalizes gifts', () => {
    const result = buildEventConfigResponse({
      slug: 'ana-leo-2026',
      couple_names: 'Ana & Leo',
      bride_name: 'Ana',
      groom_name: 'Leo',
      event_date: '2026-09-06',
      event_time: '17:00:00',
      venue_name: 'Casa da Serra',
      venue_address: 'Rua das Flores, 123',
      venue_maps_link: 'https://maps.example.com',
      active_theme: 'classic-gold',
      active_layout: 'classic',
      config: {
        texts: { metaTitle: 'Ana & Leo' },
        event: { displayDate: '06 de setembro de 2026' },
        gift: { catalog: { title: 'Legado' } },
        rsvp: { supabaseEnabled: true },
      },
      event_gifts: [
        { type: 'card', enabled: false, sort_order: 2, config: { cardPaymentLink: 'https://pay.example.com' } },
        { type: 'pix', enabled: true, sort_order: 1, config: { pixKey: 'pix-code', pixQrImage: 'pix.png' } },
        { type: 'catalog', enabled: true, sort_order: 3, config: { key: 'honeymoon', title: 'Lua de Mel', subtitle: 'Viagem', items: [{ id: 'item-1' }] } },
      ],
    });

    expect(result.texts.metaTitle).toBe('Ana & Leo');
    expect(result.activeTheme).toBe('classic-gold');
    expect(result.activeLayout).toBe('classic');
    expect(result.couple).toEqual({
      names: 'Ana & Leo',
      brideName: 'Ana',
      groomName: 'Leo',
    });
    expect(result.event).toMatchObject({
      date: '2026-09-06T17:00:00',
      time: '17:00',
      displayDate: '06 de setembro de 2026',
      locationName: 'Casa da Serra',
      venueAddress: 'Rua das Flores, 123',
      mapsLink: 'https://maps.example.com',
    });
    expect(result.rsvp).toEqual({
      supabaseEnabled: true,
      eventId: 'ana-leo-2026',
    });
    expect(result.gift).toMatchObject({
      pixKey: 'pix-code',
      pixQrImage: 'pix.png',
      cardPaymentEnabled: false,
      cardPaymentLink: 'https://pay.example.com',
      activeCatalogKey: 'honeymoon',
      catalog: {
        title: 'Lua de Mel',
        subtitle: 'Viagem',
      },
    });
    expect(result.gift.catalogs).toMatchObject({
      activeKey: 'honeymoon',
      lists: {
        honeymoon: {
          title: 'Lua de Mel',
          enabled: true,
        },
      },
    });
  });
});