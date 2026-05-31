// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201 });
  Object.defineProperty(window.navigator, 'sendBeacon', {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 390,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 844,
  });
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 Test',
  });
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    value: 'https://example.com/index.html',
  });
});

describe('guest analytics tracker', () => {
  it('nao rastreia quando analytics.enabled e false', async () => {
    const { GuestViewTracker } = await import('../../assets/js/guest-analytics.js');
    const tracker = new GuestViewTracker({
      config: {
        analytics: { enabled: false, requireGuestToken: true, trackPageDuration: true },
        rsvp: { eventId: 'siannah-diego-2026' },
      },
      guestTokenData: { token_id: 'token-1' },
      currentUrl: 'https://example.com/presente.html?g=abc',
    });

    tracker.start();
    tracker.flush('immediate');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('envia guest_views com pagina, sessao e duracao aproximada', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T18:00:00.000Z'));

    const { GuestViewTracker } = await import('../../assets/js/guest-analytics.js');
    const tracker = new GuestViewTracker({
      config: {
        analytics: { enabled: true, requireGuestToken: true, trackPageDuration: true },
        rsvp: { eventId: 'siannah-diego-2026' },
      },
      guestTokenData: { token_id: 'token-1' },
      currentUrl: 'https://example.com/presente.html?g=abc',
    });

    tracker.start();
    vi.setSystemTime(new Date('2026-05-31T18:00:12.000Z'));
    tracker.flush('immediate');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.table).toBe('guest_views');
    expect(requestBody.payload).toMatchObject({
      event_id: 'siannah-diego-2026',
      token_id: 'token-1',
      page_path: 'presente.html',
      referrer_page: 'index.html',
      device_type: 'mobile',
      duration_seconds: 12,
    });
    expect(requestBody.payload.session_id).toBeTruthy();

    vi.useRealTimers();
  });

  it('prioriza sendBeacon ao fechar a pagina', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T18:00:00.000Z'));

    const { GuestViewTracker } = await import('../../assets/js/guest-analytics.js');
    const tracker = new GuestViewTracker({
      config: {
        analytics: { enabled: true, requireGuestToken: true, trackPageDuration: true },
        rsvp: { eventId: 'siannah-diego-2026' },
      },
      guestTokenData: { token_id: 'token-1' },
      currentUrl: 'https://example.com/index.html?g=abc',
    });

    tracker.start();
    vi.setSystemTime(new Date('2026-05-31T18:00:09.000Z'));
    tracker.flush('pagehide');

    expect(window.navigator.sendBeacon).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('nao duplica a mesma visita quando a home ja foi persistida no clique de abertura', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T18:00:00.000Z'));

    const { GuestViewTracker } = await import('../../assets/js/guest-analytics.js');
    const tracker = new GuestViewTracker({
      config: {
        analytics: { enabled: true, requireGuestToken: true, trackPageDuration: true },
        rsvp: { eventId: 'siannah-diego-2026' },
      },
      guestTokenData: { token_id: 'token-1' },
      currentUrl: 'https://example.com/index.html?g=abc',
    });

    tracker.start();
    vi.setSystemTime(new Date('2026-05-31T18:00:05.000Z'));
    tracker.flush('immediate');
    vi.setSystemTime(new Date('2026-05-31T18:00:12.000Z'));
    tracker.flush('pagehide');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(window.navigator.sendBeacon).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
