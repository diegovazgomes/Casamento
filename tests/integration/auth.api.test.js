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

describe('/api/auth/login', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
  });

  it('retorna a sessão ao autenticar com sucesso', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_at: 123456,
        },
        user: { id: 'user-1', email: 'casal@example.com' },
      },
      error: null,
    });

    createClientMock.mockReturnValue({
      auth: { signInWithPassword },
    });

    const { default: handler } = await import('../../api/auth/login.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      body: { email: 'casal@example.com', password: 'senha123' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      session: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_at: 123456,
      },
      user: { id: 'user-1', email: 'casal@example.com' },
    });
  });

  it('mapeia erro de credenciais inválidas', async () => {
    createClientMock.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { message: 'Invalid login credentials' },
        }),
      },
    });

    const { default: handler } = await import('../../api/auth/login.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      body: { email: 'casal@example.com', password: 'senha123' },
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'E-mail ou senha inválidos.' });
  });
});

describe('/api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.APP_URL = 'https://example.com';
  });

  it('solicita redefinição com redirect configurado', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });

    createClientMock.mockReturnValue({
      auth: { resetPasswordForEmail },
    });

    const { default: handler } = await import('../../api/auth/forgot-password.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      headers: { origin: 'https://example.com' },
      body: { email: 'casal@example.com' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(resetPasswordForEmail).toHaveBeenCalledWith('casal@example.com', {
      redirectTo: 'https://example.com/reset-password.html',
    });
  });
});