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

function createEventsBuilder(result) {
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

describe('GET /api/check-slug', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('returns 400 when slug is missing', async () => {
    const { default: handler } = await import('../../api/check-slug.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: {}, headers: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      available: false,
      reason: 'invalid_format',
    });
  });

  it('returns unavailable for reserved slug', async () => {
    const { default: handler } = await import('../../api/check-slug.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: { slug: 'dashboard' }, headers: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      available: false,
      reason: 'reserved',
      slug: 'dashboard',
    });
  });

  it('returns available true when slug is free', async () => {
    const eventsBuilder = createEventsBuilder({ data: null, error: null });

    createClientMock.mockReturnValue({
      from: vi.fn(() => eventsBuilder),
    });

    const { default: handler } = await import('../../api/check-slug.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: { slug: 'novo-casal-2026' }, headers: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      available: true,
      reason: 'available',
      slug: 'novo-casal-2026',
    });
  });

  it('returns available false when slug is already taken', async () => {
    const eventsBuilder = createEventsBuilder({ data: { id: 'event-1' }, error: null });

    createClientMock.mockReturnValue({
      from: vi.fn(() => eventsBuilder),
    });

    const { default: handler } = await import('../../api/check-slug.js');
    const res = createMockResponse();

    await handler({ method: 'GET', query: { slug: 'ana-leo-2026' }, headers: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      available: false,
      reason: 'taken',
      slug: 'ana-leo-2026',
    });
  });

  it('returns available true when slug belongs to the current event', async () => {
    const eventsBuilder = createEventsBuilder({ data: { id: 'event-1' }, error: null });

    createClientMock.mockReturnValue({
      from: vi.fn(() => eventsBuilder),
    });

    const { default: handler } = await import('../../api/check-slug.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      query: { slug: 'ana-leo-2026', eventId: 'event-1' },
      headers: {},
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      available: true,
      reason: 'available',
      slug: 'ana-leo-2026',
    });
  });

  it('enforces rate limit per IP', async () => {
    const eventsBuilder = createEventsBuilder({ data: null, error: null });

    createClientMock.mockReturnValue({
      from: vi.fn(() => eventsBuilder),
    });

    const { default: handler } = await import('../../api/check-slug.js');

    for (let index = 0; index < 10; index += 1) {
      const res = createMockResponse();
      await handler({
        method: 'GET',
        query: { slug: `casal-${index + 1}` },
        headers: { 'x-forwarded-for': '203.0.113.11' },
      }, res);
      expect(res.statusCode).toBe(200);
    }

    const blockedRes = createMockResponse();
    await handler({
      method: 'GET',
      query: { slug: 'casal-11' },
      headers: { 'x-forwarded-for': '203.0.113.11' },
    }, blockedRes);

    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.body).toMatchObject({
      available: false,
      reason: 'rate_limited',
    });
    expect(blockedRes.headers['Retry-After']).toBeTypeOf('string');
  });
});
