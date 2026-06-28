import { beforeEach, describe, expect, it } from 'vitest';

import handler from '../../api/auth/signup.js';
import { resetRateLimitForTests } from '../../api/_lib/rate-limit.js';

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

describe('/api/auth/signup', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    resetRateLimitForTests();
  });

  it('retorna 400 quando payload e invalido', async () => {
    const req = {
      method: 'POST',
      body: {
        bride_name: 'A',
        groom_name: 'B',
        couple_name: 'A & B',
        email: 'invalido',
        whatsapp: '123',
        password: '123',
      },
      headers: {},
      socket: {},
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retorna 503 quando servico de cadastro esta indisponivel', async () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const previousAnonKey = process.env.SUPABASE_ANON_KEY;

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    const req = {
      method: 'POST',
      body: {
        bride_name: 'Siannah',
        groom_name: 'Diego',
        couple_name: 'Siannah & Diego',
        email: 'casal@example.com',
        whatsapp: '11999999999',
        password: 'senhaforte123',
      },
      headers: {},
      socket: {},
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Serviço temporariamente indisponível.' });

    if (previousUrl) process.env.SUPABASE_URL = previousUrl;
    if (previousServiceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
    if (previousAnonKey) process.env.SUPABASE_ANON_KEY = previousAnonKey;
  });

  it('retorna 429 quando o limite de cadastros por IP e excedido', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    const body = {
      bride_name: 'Siannah',
      groom_name: 'Diego',
      couple_name: 'Siannah & Diego',
      email: 'casal@example.com',
      whatsapp: '11999999999',
      password: 'senhaforte123',
    };

    for (let index = 0; index < 5; index += 1) {
      const res = createMockResponse();
      await handler({
        method: 'POST',
        body: { ...body, email: `casal-${index + 1}@example.com` },
        headers: { 'x-forwarded-for': '203.0.113.31' },
        socket: {},
      }, res);
      expect(res.statusCode).toBe(503);
    }

    const blockedRes = createMockResponse();
    await handler({
      method: 'POST',
      body: { ...body, email: 'casal-6@example.com' },
      headers: { 'x-forwarded-for': '203.0.113.31' },
      socket: {},
    }, blockedRes);

    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.headers['Retry-After']).toBeTypeOf('string');
    expect(blockedRes.body).toEqual({
      error: 'Muitas tentativas. Tente novamente em um minuto.',
    });
  });
});
