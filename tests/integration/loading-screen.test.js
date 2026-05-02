import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  document.documentElement.innerHTML = '<head></head><body></body>';
  window.history.replaceState({}, '', '/ana-leo-2026');
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Clear cookies to isolate visit-tracking state between tests
  document.cookie.split(';').forEach((cookie) => {
    const [rawName] = cookie.split('=');
    const name = rawName?.trim();
    if (!name) return;
    document.cookie = `${name}=; Max-Age=0; path=/`;
  });
});

describe('loading screen — first visit (Devazi only)', () => {
  it('stays on Devazi phase even with valid couple data on first visit', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          couple: { names: 'Ana & Leo' },
          event: { date: '2026-09-06T17:00:00' },
        }),
      });

    const { initLoadingScreen } = await import('../../assets/js/loading-screen.js');

    await initLoadingScreen();

    expect(global.fetch).toHaveBeenCalledWith('/api/event-config?slug=ana-leo-2026', expect.any(Object));
    // Data is populated but phase must NOT switch on first visit
    expect(document.getElementById('loadingInitialA')?.textContent).toBe('A');
    expect(document.getElementById('loadingInitialB')?.textContent).toBe('L');
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(false);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(true);
  });

  it('stays on Devazi phase even when app:ready fires with valid config on first visit', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          couple: { names: 'Ana & Leo' },
          event: { date: '2026-09-06T17:00:00' },
        }),
      });

    const { initLoadingScreen } = await import('../../assets/js/loading-screen.js');

    await initLoadingScreen();

    // Fire app:ready — must NOT switch on first visit
    window.dispatchEvent(new CustomEvent('app:ready', {
      detail: {
        config: {
          couple: { names: 'Siannah & Diego' },
          event: { date: '2026-09-06T17:00:00' },
        },
      },
    }));

    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(false);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(true);
  });

  it('keeps Devazi phase when couple name is a generic placeholder', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          couple: { names: 'Noiva & Noivo' },
          event: { date: '2026-09-06T17:00:00' },
        }),
      });

    const { initLoadingScreen } = await import('../../assets/js/loading-screen.js');

    await initLoadingScreen();

    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(false);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(true);
  });
});

describe('loading screen — second visit (couple phase)', () => {
  it('shows couple phase immediately (no Devazi) on second visit with valid config', async () => {
    // Pre-mark as already visited
    window.localStorage.setItem('ls-first-open:v3:ana-leo-2026', '1');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          couple: { names: 'Ana & Leo' },
          event: { date: '2026-09-06T17:00:00' },
        }),
      });

    const { initLoadingScreen } = await import('../../assets/js/loading-screen.js');

    await initLoadingScreen();

    // Couple phase visible immediately (Devazi never shown on second visit)
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(true);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(false);
    // Data is populated
    expect(document.getElementById('loadingInitialA')?.textContent).toBe('A');
    expect(document.getElementById('loadingInitialB')?.textContent).toBe('L');
    expect(document.getElementById('loadingEventDate')?.textContent).toBe('06 . 09 . 2026');
  });

  it('upgrades to couple phase via app:ready on second visit', async () => {
    window.localStorage.setItem('ls-first-open:v3:ana-leo-2026', '1');

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          couple: { names: 'Noiva & Noivo' },
          event: { date: '2026-09-06T17:00:00' },
        }),
      });

    const { initLoadingScreen } = await import('../../assets/js/loading-screen.js');

    await initLoadingScreen();

    // Already showing couple phase (generic name from fetch — data is S&D but phase is visible)
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(true);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(false);

    // app:ready brings the real names
    window.dispatchEvent(new CustomEvent('app:ready', {
      detail: {
        config: {
          couple: { names: 'Siannah & Diego' },
          event: { date: '2026-09-06T17:00:00' },
        },
      },
    }));

    // Couple phase still visible with updated names
    expect(document.getElementById('loadingInitialA')?.textContent).toBe('S');
    expect(document.getElementById('loadingInitialB')?.textContent).toBe('D');
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(true);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(false);
  });
});
