import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireOwnedEventMock } = vi.hoisted(() => ({
  requireOwnedEventMock: vi.fn(),
}));

vi.mock('../../api/_lib/dashboard-auth.js', () => ({
  requireOwnedEvent: requireOwnedEventMock,
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

function createGuestViewsBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn().mockResolvedValue(result),
  };

  return builder;
}

describe('GET /api/dashboard/confirmations?mode=audience', () => {
  beforeEach(() => {
    vi.resetModules();
    requireOwnedEventMock.mockReset();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('agrega guest_views por pagina e retorna resumo sem jornada individual', async () => {
    const guestViewsBuilder = createGuestViewsBuilder({
      data: [
        {
          id: 'view-0',
          token_id: 'token-1',
          opened_at: '2026-05-31T17:58:00.000Z',
          duration_seconds: 15,
          page_path: '/siannah-diego-convida',
        },
        {
          id: 'view-1',
          token_id: 'token-1',
          opened_at: '2026-05-31T18:00:00.000Z',
          duration_seconds: 20,
          page_path: 'presente.html',
        },
        {
          id: 'view-2',
          token_id: 'token-1',
          opened_at: '2026-05-31T18:05:00.000Z',
          duration_seconds: 25,
          page_path: 'presente.html',
        },
        {
          id: 'view-3',
          token_id: 'token-2',
          opened_at: '2026-05-31T17:30:00.000Z',
          duration_seconds: 8,
          page_path: 'traje.html',
        },
      ],
      count: 4,
      error: null,
    });

    requireOwnedEventMock.mockResolvedValue({
      ok: true,
      event: { id: 'event-1', slug: 'siannah-diego-convida' },
      supabase: {
        from: vi.fn(() => guestViewsBuilder),
      },
    });

    const { default: handler } = await import('../../api/dashboard/confirmations.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      url: '/api/dashboard/confirmations?eventId=event-1&mode=audience',
      query: {
        eventId: 'event-1',
        mode: 'audience',
        page: '1',
        pageSize: '10',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(guestViewsBuilder.eq).toHaveBeenCalledWith('event_id', 'siannah-diego-convida');
    expect(res.body.summary).toMatchObject({
      totalViews: 4,
      activeInviteCount: 2,
      uniquePages: 3,
      totalDurationSeconds: 68,
      averageDurationPerViewSeconds: 17,
      mostVisitedPage: {
        pagePath: '/presente.html',
        pageLabel: 'Presentes',
        viewCount: 2,
      },
    });
    expect(res.body.data[0]).toMatchObject({
      pagePath: '/presente.html',
      pageLabel: 'Presentes',
      viewCount: 2,
      totalDurationSeconds: 45,
      averageDurationSeconds: 23,
    });
    expect(res.body.data[0]).not.toHaveProperty('tokenId');
    expect(res.body.filters.pages[0]).toMatchObject({
      pagePath: '/presente.html',
      pageLabel: 'Presentes',
      viewCount: 2,
    });
  });

  it('filtra a audiencia agregada por busca e pagina', async () => {
    const guestViewsBuilder = createGuestViewsBuilder({
      data: [
        {
          id: 'view-1',
          token_id: 'token-1',
          opened_at: '2026-05-31T18:00:00.000Z',
          duration_seconds: 10,
          page_path: 'presente.html',
        },
        {
          id: 'view-2',
          token_id: 'token-2',
          opened_at: '2026-05-31T18:10:00.000Z',
          duration_seconds: 12,
          page_path: 'traje.html',
        },
      ],
      count: 2,
      error: null,
    });

    requireOwnedEventMock.mockResolvedValue({
      ok: true,
      event: { id: 'event-1', slug: 'siannah-diego-convida' },
      supabase: {
        from: vi.fn(() => guestViewsBuilder),
      },
    });

    const { default: handler } = await import('../../api/dashboard/confirmations.js');
    const res = createMockResponse();

    await handler({
      method: 'GET',
      url: '/api/dashboard/confirmations?eventId=event-1&mode=audience&search=traje&pagePath=traje.html',
      query: {
        eventId: 'event-1',
        mode: 'audience',
        search: 'traje',
        pagePath: 'traje.html',
        page: '1',
        pageSize: '10',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.summary).toMatchObject({
      totalViews: 2,
      activeInviteCount: 2,
      totalDurationSeconds: 22,
    });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      pagePath: '/traje.html',
      pageLabel: 'Traje',
      viewCount: 1,
    });
  });
});
