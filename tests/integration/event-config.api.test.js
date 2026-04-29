import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createQueryBuilder(result) {
  return {
    select: vi.fn(function select() {
      return this;
    }),
    eq: vi.fn(function eq() {
      return this;
    }),
    order: vi.fn(function order() {
      return this;
    }),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function createStorageMock({ listData = [], listError = null } = {}) {
  return {
    from: vi.fn(() => ({
      list: vi.fn().mockResolvedValue({ data: listData, error: listError }),
      getPublicUrl: vi.fn((path) => ({
        data: { publicUrl: `https://cdn.example.com/${path}` },
      })),
    })),
  };
}

describe('GET /api/event-config', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('returns a mapped public config with cache headers', async () => {
    const queryBuilder = createQueryBuilder({
      data: {
        id: 'event-1',
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
          texts: { metaTitle: 'Ana & Leo - Casamento' },
          event: { displayDate: '06 de setembro de 2026' },
          rsvp: { supabaseEnabled: true },
        },
        event_gifts: [
          { type: 'pix', enabled: true, sort_order: 1, config: { pixKey: 'pix-code' } },
          { type: 'card', enabled: false, sort_order: 2, config: { cardPaymentLink: 'https://pay.example.com' } },
          { type: 'catalog', enabled: true, sort_order: 3, config: { key: 'honeymoon', title: 'Lua de Mel', items: [{ id: 'item-1' }] } },
        ],
      },
      error: null,
    });
    createClientMock.mockReturnValue({
      from: vi.fn(() => queryBuilder),
      storage: createStorageMock({
        listData: [
          { name: '1712400012345-foto-cerimonia.jpg' },
          { name: '1712400012350-foto-festa.png' },
        ],
      }),
    });

    const { default: handler } = await import('../../api/event-config.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: { slug: 'ana-leo-2026' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store, no-cache, must-revalidate');
    expect(res.body).toMatchObject({
      activeTheme: 'classic-gold',
      activeLayout: 'classic',
      couple: {
        names: 'Ana & Leo',
        brideName: 'Ana',
        groomName: 'Leo',
      },
      event: {
        date: '2026-09-06T17:00:00',
        time: '17:00',
        displayDate: '06 de setembro de 2026',
        locationName: 'Casa da Serra',
      },
      gift: {
        pixKey: 'pix-code',
        cardPaymentEnabled: false,
        activeCatalogKey: 'honeymoon',
        catalog: {
          title: 'Lua de Mel',
        },
      },
      pages: {
        historia: {
          content: {
            gallery: [
              {
                src: 'https://cdn.example.com/event-1/gallery/1712400012345-foto-cerimonia.jpg',
                alt: 'Foto cerimonia',
              },
              {
                src: 'https://cdn.example.com/event-1/gallery/1712400012350-foto-festa.png',
                alt: 'Foto festa',
              },
            ],
          },
        },
      },
      rsvp: {
        eventId: 'ana-leo-2026',
        supabaseEnabled: true,
      },
    });
  });

  it('normalizes legacy snake_case keys from DB config', async () => {
    const queryBuilder = createQueryBuilder({
      data: {
        id: 'event-legacy',
        slug: 'casal-legado-2026',
        couple_names: 'Casal Legado',
        config: {
          rsvp: {
            event_id: 'casal-legado-2026',
            supabase_enabled: true,
          },
          whatsapp: {
            destination_phone: '5511999999999',
            recipient_name: 'Noiva',
            redirect_delay_ms: 3500,
          },
        },
        event_gifts: [],
      },
      error: null,
    });

    createClientMock.mockReturnValue({
      from: vi.fn(() => queryBuilder),
      storage: createStorageMock({ listData: [] }),
    });

    const { default: handler } = await import('../../api/event-config.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: { slug: 'casal-legado-2026' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.rsvp).toMatchObject({
      eventId: 'casal-legado-2026',
      supabaseEnabled: true,
    });
    expect(res.body?.whatsapp).toMatchObject({
      destinationPhone: '5511999999999',
      recipientName: 'Noiva',
      redirectDelayMs: 3500,
    });
    expect(res.body?.rsvp?.event_id).toBeUndefined();
    expect(res.body?.rsvp?.supabase_enabled).toBeUndefined();
    expect(res.body?.whatsapp?.destination_phone).toBeUndefined();
  });

  it('returns 400 when slug is missing', async () => {
    const { default: handler } = await import('../../api/event-config.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'slug is required' });
  });

  it('returns 404 when the slug does not exist', async () => {
    const queryBuilder = createQueryBuilder({ data: null, error: null });
    createClientMock.mockReturnValue({
      from: vi.fn(() => queryBuilder),
      storage: createStorageMock(),
    });

    const { default: handler } = await import('../../api/event-config.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: { slug: 'missing-event' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).toEqual({ error: 'Event not found' });
  });

  it('returns empty gallery when storage has no files', async () => {
    const queryBuilder = createQueryBuilder({
      data: {
        id: 'event-2',
        slug: 'empty-gallery-event',
        couple_names: 'Ana & Leo',
        config: {
          pages: {
            historia: {
              content: {
                gallery: [
                  { src: 'assets/images/gallery/foto1.png', alt: 'Foto antiga' },
                ],
              },
            },
          },
        },
        event_gifts: [],
      },
      error: null,
    });

    createClientMock.mockReturnValue({
      from: vi.fn(() => queryBuilder),
      storage: createStorageMock({ listData: [] }),
    });

    const { default: handler } = await import('../../api/event-config.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: { slug: 'empty-gallery-event' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.pages?.historia?.content?.gallery).toEqual([]);
  });
});