import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  document.documentElement.innerHTML = '<head></head><body></body>';
  window.history.replaceState({}, '', '/ana-leo-2026');
});

describe('loading screen config source', () => {
  it('uses the slug API and switches to couple phase with initials and date', async () => {
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

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/event-config?slug=ana-leo-2026', expect.any(Object));
    expect(document.getElementById('loadingInitialA')?.textContent).toBe('A');
    expect(document.getElementById('loadingInitialB')?.textContent).toBe('L');
    expect(document.getElementById('loadingEventDate')?.textContent).toBe('06 . 09 . 2026');
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(true);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(false);
  });
});
