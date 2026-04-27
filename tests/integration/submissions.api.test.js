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

describe('POST /api/submissions', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('insere guest_submissions para mensagem', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: insertMock })),
    });

    const { default: handler } = await import('../../api/submissions.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      body: {
        table: 'guest_submissions',
        payload: {
          type: 'message',
          guest_name: 'Ana',
          event_id: 'evento-teste',
          source: 'mensagem-page',
          message: 'Parabens ao casal',
        },
      },
    }, res);

    expect(res.statusCode).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'message',
      guest_name: 'Ana',
      event_id: 'evento-teste',
      message: 'Parabens ao casal',
    }));
  });

  it('insere rsvp_confirmations para confirmação', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: insertMock })),
    });

    const { default: handler } = await import('../../api/submissions.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      body: {
        table: 'rsvp_confirmations',
        payload: {
          name: 'Diego',
          phone: '11999999999',
          attendance: 'yes',
          event_id: 'siannah-diego-2026',
          source: 'website',
          marketing_consent: true,
        },
      },
    }, res);

    expect(res.statusCode).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Diego',
      phone: '11999999999',
      attendance: 'yes',
      event_id: 'siannah-diego-2026',
      marketing_consent: true,
    }));

    const payload = insertMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty('group_name');
    expect(payload).not.toHaveProperty('group_max_confirmations');
  });

  it('inclui colunas opcionais de grupo quando enviadas no RSVP', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: insertMock })),
    });

    const { default: handler } = await import('../../api/submissions.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      body: {
        table: 'rsvp_confirmations',
        payload: {
          name: 'Diego',
          phone: '11999999999',
          attendance: 'yes',
          event_id: 'siannah-diego-2026',
          token_id: 'token-1',
          group_name: 'Familia Silva',
          group_max_confirmations: 3,
        },
      },
    }, res);

    expect(res.statusCode).toBe(201);

    const payload = insertMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      token_id: 'token-1',
      group_name: 'Familia Silva',
      group_max_confirmations: 3,
    });
  });

  it('retorna 400 para payload inválido', async () => {
    createClientMock.mockReturnValue({
      from: vi.fn(),
    });

    const { default: handler } = await import('../../api/submissions.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      body: {
        table: 'guest_submissions',
        payload: {
          type: 'message',
          event_id: 'evento-teste',
          message: '',
        },
      },
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
