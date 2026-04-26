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
      rsvp: {
        eventId: 'ana-leo-2026',
        supabaseEnabled: true,
      },
    });
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
    });

    const { default: handler } = await import('../../api/event-config.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: { slug: 'missing-event' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).toEqual({ error: 'Event not found' });
  });
});