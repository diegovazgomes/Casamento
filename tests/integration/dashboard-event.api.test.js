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
    ended: false,
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
    end() {
      this.ended = true;
      return this;
    },
  };
}

function createSelectBuilder(result) {
  return {
    select: vi.fn(function select() {
      return this;
    }),
    eq: vi.fn(function eq() {
      return this;
    }),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function createOrderedSelectBuilder(result) {
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
    limit: vi.fn(function limit() {
      return this;
    }),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function createUpdateBuilder(result) {
  return {
    update: vi.fn(function update() {
      return this;
    }),
    eq: vi.fn(function eq() {
      return this;
    }),
    select: vi.fn(function select() {
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

describe('/api/dashboard/event', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('loads an event config by slug for the current dashboard session', async () => {
    const currentEventBuilder = createSelectBuilder({
      data: {
        id: 'event-1',
        slug: 'ana-leo-2026',
        user_id: 'user-1',
        active_theme: 'classic-gold',
        active_layout: 'classic',
        updated_at: '2026-04-26T12:00:00.000Z',
        couple_names: 'Ana & Leo',
        bride_name: 'Ana',
        groom_name: 'Leo',
        event_date: '2026-09-06',
        event_time: '17:00:00',
        venue_name: 'Casa da Serra',
        venue_address: 'Rua das Flores, 123',
        venue_maps_link: 'https://maps.example.com',
        config: {
          texts: { metaTitle: 'Ana & Leo - Casamento' },
          rsvp: { supabaseEnabled: true },
        },
        event_gifts: [],
      },
      error: null,
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => currentEventBuilder),
      storage: createStorageMock({
        listData: [
          { name: '1712400012345-foto-1.jpg' },
        ],
      }),
    });

    const { default: handler } = await import('../../api/dashboard/event.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
      query: { slug: 'ana-leo-2026' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      event: {
        id: 'event-1',
        slug: 'ana-leo-2026',
      },
      config: {
        couple: { names: 'Ana & Leo' },
        rsvp: { eventId: 'ana-leo-2026', supabaseEnabled: true },
        pages: {
          historia: {
            content: {
              gallery: [
                {
                  src: 'https://cdn.example.com/ana-leo-2026/gallery/1712400012345-foto-1.jpg',
                  alt: 'Foto 1',
                },
              ],
            },
          },
        },
      },
    });
  });

  it('falls back to the latest owned event on GET when slug lookup is stale', async () => {
    const staleLookupBuilder = createSelectBuilder({ data: null, error: null });
    const latestOwnedBuilder = createOrderedSelectBuilder({
      data: {
        id: 'event-2',
        slug: 'ana-leo-2026-novo',
        user_id: 'user-1',
        active_theme: 'assets/layouts/classic/themes/classic-gold.json',
        active_layout: 'classic',
        updated_at: '2026-05-12T12:00:00.000Z',
        couple_names: 'Ana & Leo',
        bride_name: 'Ana',
        groom_name: 'Leo',
        event_date: '2026-09-06',
        event_time: '17:00:00',
        venue_name: 'Casa da Serra',
        venue_address: 'Rua das Flores, 123',
        venue_maps_link: 'https://maps.example.com',
        config: {},
        event_gifts: [],
      },
      error: null,
    });

    const fromMock = vi.fn()
      .mockReturnValueOnce(staleLookupBuilder)
      .mockReturnValueOnce(latestOwnedBuilder);

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: fromMock,
      storage: createStorageMock(),
    });

    const { default: handler } = await import('../../api/dashboard/event.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
      query: { slug: 'ana-leo-2026-antigo' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.event.slug).toBe('ana-leo-2026-novo');
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it('updates allowed fields and deep-merges config for the authenticated owner', async () => {
    const currentEventBuilder = createSelectBuilder({
      data: {
        id: 'event-1',
        user_id: 'user-1',
        config: {
          texts: { metaTitle: 'Antes' },
          pages: { faq: { enabled: true } },
        },
      },
      error: null,
    });
    const updatedEventBuilder = createUpdateBuilder({
      data: {
        id: 'event-1',
        user_id: 'user-1',
        slug: 'test-event',
        couple_names: 'Test Couple',
        bride_name: 'Bride',
        groom_name: 'Groom',
        event_date: '2026-09-06',
        event_time: '17:00',
        venue_name: 'Venue',
        venue_address: 'Address',
        venue_maps_link: 'https://maps.google.com',
        active_theme: 'assets/layouts/classic/themes/classic-blue.json',
        active_layout: 'classic',
        updated_at: '2026-04-26T10:00:00Z',
        config: {
          activeTheme: 'assets/layouts/classic/themes/classic-blue.json',
          texts: { metaTitle: 'Depois' },
          pages: { faq: { enabled: true }, historia: { enabled: true } },
        },
      },
      error: null,
    });
    const fromMock = vi.fn()
      .mockReturnValueOnce(currentEventBuilder)
      .mockReturnValueOnce(updatedEventBuilder);

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: fromMock,
      storage: createStorageMock({
        listData: [
          { name: '1712400012345-foto-1.jpg' },
        ],
      }),
    });

    const { default: handler } = await import('../../api/dashboard/event.js');
    const res = createMockResponse();

    await handler({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        eventId: 'event-1',
        config: {
          activeTheme: 'assets/layouts/classic/themes/classic-blue.json',
          texts: { metaTitle: 'Depois' },
          pages: { historia: { enabled: true } },
        },
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(updatedEventBuilder.update).toHaveBeenCalledWith({
      active_theme: 'assets/layouts/classic/themes/classic-blue.json',
      config: {
        activeTheme: 'assets/layouts/classic/themes/classic-blue.json',
        texts: { metaTitle: 'Depois' },
        pages: { faq: { enabled: true }, historia: { enabled: true } },
      },
    });
    expect(res.body).toMatchObject({
      event: {
        id: 'event-1',
        slug: 'test-event',
        user_id: 'user-1',
        couple_names: 'Test Couple',
        bride_name: 'Bride',
        groom_name: 'Groom',
        event_date: '2026-09-06',
        event_time: '17:00',
        venue_name: 'Venue',
        venue_address: 'Address',
        venue_maps_link: 'https://maps.google.com',
        active_theme: 'assets/layouts/classic/themes/classic-blue.json',
        active_layout: 'classic',
        updated_at: '2026-04-26T10:00:00Z',
      },
      config: {
        pages: {
          historia: {
            content: {
              gallery: [
                {
                  src: 'https://cdn.example.com/test-event/gallery/1712400012345-foto-1.jpg',
                  alt: 'Foto 1',
                },
              ],
            },
          },
        },
      },
    });
  });

  it('falls back to the latest owned event on PATCH when the lookup is missing', async () => {
    const latestOwnedEventBuilder = createOrderedSelectBuilder({
      data: {
        id: 'event-1',
        user_id: 'user-1',
        slug: 'test-event',
        config: {
          texts: { metaTitle: 'Antes' },
        },
      },
      error: null,
    });
    const updatedEventBuilder = createUpdateBuilder({
      data: {
        id: 'event-1',
        user_id: 'user-1',
        slug: 'test-event',
        couple_names: 'Test Couple',
        bride_name: 'Bride',
        groom_name: 'Groom',
        event_date: '2026-09-06',
        event_time: '17:00',
        venue_name: 'Venue',
        venue_address: 'Address',
        venue_maps_link: 'https://maps.google.com',
        active_theme: 'classic-gold',
        active_layout: 'classic',
        updated_at: '2026-04-26T10:00:00Z',
        config: {
          texts: { metaTitle: 'Depois' },
        },
      },
      error: null,
    });
    const fromMock = vi.fn()
      .mockReturnValueOnce(latestOwnedEventBuilder)
      .mockReturnValueOnce(updatedEventBuilder);

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: fromMock,
      storage: createStorageMock(),
    });

    const { default: handler } = await import('../../api/dashboard/event.js');
    const res = createMockResponse();

    await handler({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        config: {
          texts: { metaTitle: 'Depois' },
        },
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(updatedEventBuilder.update).toHaveBeenCalledWith({
      config: {
        texts: { metaTitle: 'Depois' },
      },
    });
  });

  it('ignores gallery entries sent by PATCH payload', async () => {
    const currentEventBuilder = createSelectBuilder({
      data: {
        id: 'event-1',
        user_id: 'user-1',
        config: {
          pages: {
            faq: { enabled: true },
          },
        },
      },
      error: null,
    });
    const updatedEventBuilder = createUpdateBuilder({
      data: {
        id: 'event-1',
        user_id: 'user-1',
        slug: 'test-event',
        updated_at: '2026-04-26T10:00:00Z',
        config: {
          pages: {
            faq: { enabled: true },
          },
        },
      },
      error: null,
    });

    const fromMock = vi.fn()
      .mockReturnValueOnce(currentEventBuilder)
      .mockReturnValueOnce(updatedEventBuilder);

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: fromMock,
      storage: createStorageMock(),
    });

    const { default: handler } = await import('../../api/dashboard/event.js');
    const res = createMockResponse();

    await handler({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: {
        eventId: 'event-1',
        config: {
          pages: {
            historia: {
              content: {
                gallery: [
                  { src: 'assets/images/gallery/foto1.png', alt: 'Antiga' },
                ],
              },
            },
          },
        },
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(updatedEventBuilder.update).toHaveBeenCalledWith({
      config: {
        pages: {
          faq: { enabled: true },
          historia: {
            content: {},
          },
        },
      },
    });
  });

  it('returns 401 when the bearer token is missing', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      storage: createStorageMock(),
    });

    const { default: handler } = await import('../../api/dashboard/event.js');
    const res = createMockResponse();

    await handler({ method: 'PATCH', headers: {}, body: { eventId: 'event-1' } }, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });
});

describe('/api/dashboard/guest-groups', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('returns invite links with event slug on GET and POST', async () => {
    const ownedEventBuilder = createSelectBuilder({
      data: {
        id: 'event-1',
        slug: 'ana-leo-2026',
        user_id: 'user-1',
        config: {},
      },
      error: null,
    });
    const guestTokensBuilder = {
      select: vi.fn(function select() {
        return this;
      }),
      eq: vi.fn(function eq() {
        return this;
      }),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'token-row-1',
            token: 'guest-token-1',
            group_name: 'Familia Silva',
            max_confirmations: 2,
            phone: '5511999999999',
            notes: null,
            created_at: '2026-05-07T12:00:00Z',
          },
        ],
        error: null,
      }),
    };
    const confirmationsCountBuilder = {
      select: vi.fn(function select() {
        return this;
      }),
      eq: vi.fn(function eq() {
        return this;
      }),
    };
    const insertGuestTokenBuilder = {
      insert: vi.fn(function insert() {
        return this;
      }),
      select: vi.fn(function select() {
        return this;
      }),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'token-row-2',
          token: 'guest-token-2',
          group_name: 'Maria',
          max_confirmations: 1,
          phone: null,
          notes: null,
        },
        error: null,
      }),
    };

    const fromMock = vi.fn((table) => {
      if (table === 'events') {
        return ownedEventBuilder;
      }
      if (table === 'guest_tokens') {
        return fromMock.mock.calls.filter(([name]) => name === 'guest_tokens').length === 1
          ? guestTokensBuilder
          : insertGuestTokenBuilder;
      }
      if (table === 'rsvp_confirmations') {
        return confirmationsCountBuilder;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: fromMock,
    });

    const { default: handler } = await import('../../api/dashboard/guest-groups.js');

    const getRes = createMockResponse();
    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token', host: 'example.com', 'x-forwarded-proto': 'https' },
      query: { eventId: 'event-1' },
    }, getRes);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data[0]).toMatchObject({
      token: 'guest-token-1',
      inviteLink: 'https://example.com/ana-leo-2026?g=guest-token-1',
    });

    const postRes = createMockResponse();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token', host: 'example.com', 'x-forwarded-proto': 'https' },
      body: {
        groupName: 'Maria',
        maxConfirmations: 1,
      },
      query: { eventId: 'event-1' },
    }, postRes);

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.data).toMatchObject({
      token: 'guest-token-2',
      inviteLink: 'https://example.com/ana-leo-2026?g=guest-token-2',
    });
  });
});