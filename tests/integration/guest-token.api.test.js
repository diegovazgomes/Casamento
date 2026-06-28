import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
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

function createFetchResponse(body, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status || 200,
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: vi.fn((name) => {
        if (String(name).toLowerCase() === 'content-range') {
          return options.contentRange || null;
        }
        return null;
      }),
    },
  };
}

describe('GET /api/guest-token', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns guest group data for a valid token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createFetchResponse([{
        id: 'token-id-1',
        group_name: 'Familia Silva',
        max_confirmations: 4,
      }]))
      .mockResolvedValueOnce(createFetchResponse([], { contentRange: '0-1/2' }));

    vi.stubGlobal('fetch', fetchMock);

    const { default: handler } = await import('../../api/guest-token.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      query: { token: 'guest-token-1' },
      headers: { 'x-forwarded-for': '203.0.113.21' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).toEqual({
      token_id: 'token-id-1',
      group_name: 'Familia Silva',
      max_confirmations: 4,
      confirmation_count: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns 429 after exceeding the token lookup limit for the same IP', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createFetchResponse([], { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const { default: handler } = await import('../../api/guest-token.js');

    for (let index = 0; index < 20; index += 1) {
      const res = createMockResponse();
      await handler({
        method: 'GET',
        query: { token: `guest-token-${index + 1}` },
        headers: { 'x-forwarded-for': '203.0.113.22' },
      }, res);
      expect(res.statusCode).toBe(404);
    }

    const blockedRes = createMockResponse();
    await handler({
      method: 'GET',
      query: { token: 'guest-token-21' },
      headers: { 'x-forwarded-for': '203.0.113.22' },
    }, blockedRes);

    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.headers['Retry-After']).toBeTypeOf('string');
    expect(blockedRes.body).toEqual({
      error: 'muitas tentativas. tente novamente em um minuto.',
    });
  });
});
