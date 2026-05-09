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
    send(payload) {
      this.body = payload;
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

describe('GET /api/event-config?mode=share', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('renders OG metadata with the hero image and redirects to the invite', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn(() => createSelectBuilder({
        data: {
          slug: 'ana-leo-2026',
          couple_names: 'Ana & Leo',
          is_active: true,
          config: {
            couple: { names: 'Ana & Leo' },
            texts: {
              metaTitle: 'Ana & Leo - Casamento',
              metaDescription: 'Convite digital do casal',
            },
            media: {
              heroImage: 'https://cdn.example.com/hero/ana-leo.jpg',
            },
          },
        },
        error: null,
      })),
    });

    const { default: handler } = await import('../../api/event-config.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
      url: '/api/event-config?mode=share&slug=ana-leo-2026&g=guest-token-1',
      query: { mode: 'share', slug: 'ana-leo-2026', g: 'guest-token-1' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(res.body).toContain('property="og:image" content="https://cdn.example.com/hero/ana-leo.jpg"');
    expect(res.body).toContain('property="og:image:secure_url" content="https://cdn.example.com/hero/ana-leo.jpg"');
    expect(res.body).toContain('property="og:image:width" content="1200"');
    expect(res.body).toContain('property="og:image:height" content="630"');
    expect(res.body).toContain('property="og:image:alt" content="Ana &amp; Leo - convite de casamento"');
    expect(res.body).toContain('property="og:image:type" content="image/jpeg"');
    expect(res.body).toContain('property="og:url" content="https://example.com/ana-leo-2026?g=guest-token-1"');
    expect(res.body).toContain('name="twitter:image:alt" content="Ana &amp; Leo - convite de casamento"');
    expect(res.body).toContain('http-equiv="refresh" content="0;url=https://example.com/ana-leo-2026?g=guest-token-1"');
  });

  it('falls back og:image to default PNG when hero image is webp', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn(() => createSelectBuilder({
        data: {
          slug: 'ana-leo-2026',
          couple_names: 'Ana & Leo',
          is_active: true,
          config: {
            couple: { names: 'Ana & Leo' },
            texts: {
              metaTitle: 'Ana & Leo - Casamento',
              metaDescription: 'Convite digital do casal',
            },
            media: {
              heroImage: 'https://cdn.example.com/hero/ana-leo.webp',
            },
          },
        },
        error: null,
      })),
    });

    const { default: handler } = await import('../../api/event-config.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
      url: '/api/event-config?mode=share&slug=ana-leo-2026&g=guest-token-1',
      query: { mode: 'share', slug: 'ana-leo-2026', g: 'guest-token-1' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('property="og:image" content="https://example.com/assets/images/couple/casal.png"');
    expect(res.body).toContain('property="og:image:type" content="image/png"');
  });
});