import { describe, expect, it } from 'vitest';

import handler from '../../api/auth/signup.js';

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
});
