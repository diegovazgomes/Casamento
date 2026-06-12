import { beforeEach, describe, expect, it } from 'vitest';

import handler from '../../api/payments.js';
import { resetRateLimitForTests } from '../../api/_lib/rate-limit.js';

function createMockRequest({ action = 'checkout', headers = {} } = {}) {
  return {
    method: 'POST',
    query: { action },
    headers,
    async *[Symbol.asyncIterator]() {},
  };
}

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

describe('POST /api/payments?action=checkout', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    resetRateLimitForTests();
  });

  it('returns 429 when the checkout limit is exceeded for the same IP', async () => {
    for (let index = 0; index < 5; index += 1) {
      const res = createMockResponse();
      await handler(createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.41' },
      }), res);
      expect(res.statusCode).toBe(503);
    }

    const blockedRes = createMockResponse();
    await handler(createMockRequest({
      headers: { 'x-forwarded-for': '203.0.113.41' },
    }), blockedRes);

    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.headers['Retry-After']).toBeTypeOf('string');
    expect(blockedRes.body).toEqual({
      error: 'Muitas tentativas de checkout. Tente novamente em um minuto.',
    });
  });
});
