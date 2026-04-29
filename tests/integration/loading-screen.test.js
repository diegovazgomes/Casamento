import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  document.documentElement.innerHTML = '<head></head><body></body>';
  window.history.replaceState({}, '', '/ana-leo-2026');
});

describe('loading screen config source', () => {
  it('uses the slug API and resolves a theme file from layout + theme key', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activeLayout: 'modern',
          activeTheme: 'black-silver',
          couple: { names: 'Ana & Leo' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          colors: {
            background: '#111111',
            text: '#eeeeee',
            primary: '#cccccc',
          },
        }),
      });

    const { initLoadingScreen } = await import('../../assets/js/loading-screen.js');

    await initLoadingScreen();

    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/event-config?slug=ana-leo-2026', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(2, 'assets/layouts/modern/themes/black-silver.json', expect.any(Object));
    expect(document.getElementById('loadingNames')?.textContent).toBe('Ana & Leo');
  });
});
