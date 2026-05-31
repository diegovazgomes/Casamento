import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';

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

describe('POST /api/submissions guest_views', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('insere guest_views para audiencia por pagina', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: insertMock })),
    });

    const { default: handler } = await import('../../api/submissions.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      headers: {},
      body: {
        table: 'guest_views',
        payload: {
          event_id: 'siannah-diego-2026',
          token_id: 'token-1',
          opened_at: '2026-05-31T18:00:00.000Z',
          left_at: '2026-05-31T18:00:25.000Z',
          duration_seconds: 25,
          user_agent: 'Mozilla/5.0',
          viewport_width: 390,
          viewport_height: 844,
          device_type: 'mobile',
          page_path: 'presente.html',
          session_id: 'session-123',
          referrer_page: 'index.html',
        },
      },
    }, res);

    expect(res.statusCode).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      event_id: 'siannah-diego-2026',
      token_id: 'token-1',
      duration_seconds: 25,
      device_type: 'mobile',
      page_path: 'presente.html',
      session_id: 'session-123',
      referrer_page: 'index.html',
    }));
  });

  it('reenvia guest_views sem colunas novas quando o schema ainda nao foi migrado', async () => {
    const insertMock = vi.fn()
      .mockResolvedValueOnce({
        error: {
          code: 'PGRST204',
          message: "Could not find the 'page_path' column of 'guest_views' in the schema cache",
          details: '',
          hint: '',
        },
      })
      .mockResolvedValueOnce({ error: null });

    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: insertMock })),
    });

    const { default: handler } = await import('../../api/submissions.js');
    const res = createMockResponse();

    await handler({
      method: 'POST',
      headers: {},
      body: {
        table: 'guest_views',
        payload: {
          event_id: 'siannah-diego-2026',
          token_id: 'token-1',
          opened_at: '2026-05-31T18:00:00.000Z',
          left_at: '2026-05-31T18:00:25.000Z',
          duration_seconds: 25,
          viewport_width: 390,
          viewport_height: 844,
          device_type: 'mobile',
          page_path: 'presente.html',
          session_id: 'session-123',
          referrer_page: 'index.html',
        },
      },
    }, res);

    expect(res.statusCode).toBe(201);
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(insertMock.mock.calls[1][0]).toMatchObject({
      event_id: 'siannah-diego-2026',
      token_id: 'token-1',
      device_type: 'mobile',
    });
    expect(insertMock.mock.calls[1][0]).not.toHaveProperty('page_path');
    expect(insertMock.mock.calls[1][0]).not.toHaveProperty('session_id');
    expect(insertMock.mock.calls[1][0]).not.toHaveProperty('left_at');
    expect(insertMock.mock.calls[1][0]).not.toHaveProperty('duration_seconds');
    expect(insertMock.mock.calls[1][0]).not.toHaveProperty('referrer_page');
  });

  it('aceita guest_views quando o corpo chega cru, como no fechamento da aba com sendBeacon', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      from: vi.fn(() => ({ insert: insertMock })),
    });

    const { default: handler } = await import('../../api/submissions.js');
    const res = createMockResponse();
    const req = Readable.from([JSON.stringify({
      table: 'guest_views',
      payload: {
        event_id: 'siannah-diego-2026',
        token_id: 'token-1',
        opened_at: '2026-05-31T18:00:00.000Z',
        left_at: '2026-05-31T18:00:09.000Z',
        duration_seconds: 9,
        viewport_width: 390,
        viewport_height: 844,
        device_type: 'mobile',
        page_path: 'index.html',
        session_id: 'session-raw-body',
      },
    })]);

    req.method = 'POST';
    req.headers = { 'content-type': 'text/plain;charset=UTF-8' };

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      event_id: 'siannah-diego-2026',
      token_id: 'token-1',
      page_path: 'index.html',
      duration_seconds: 9,
      session_id: 'session-raw-body',
    }));
  });
});
