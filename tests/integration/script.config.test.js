import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('script config/theme loaders', () => {
  it('loadConfig merges site config with defaults', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ couple: { names: 'Ana & Leo' } })
    });

    const { loadConfig } = await import('../../assets/js/script.js');

    const defaults = {
      couple: { names: 'Default & Couple' },
      event: { date: '2026-09-06' },
      whatsapp: { destinationPhone: '5511999999999' }
    };

    const config = await loadConfig('/fake/site.json', defaults);

    expect(config.couple.names).toBe('Ana & Leo');
    expect(config.event.date).toBe('2026-09-06');
    expect(config.whatsapp.destinationPhone).toBe('5511999999999');
  });

  it('loadConfig falls back to defaults when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));

    const { loadConfig } = await import('../../assets/js/script.js');

    const defaults = {
      couple: { names: 'Fallback Couple' },
      event: { date: '2026-09-06' }
    };

    const config = await loadConfig('/fake/site.json', defaults);

    expect(config).toEqual(defaults);
    expect(config).not.toBe(defaults);
  });

  it('loadTheme merges fetched theme over defaults', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ colors: { primary: '#123456' } })
    });

    const { loadTheme } = await import('../../assets/js/script.js');

    const defaults = {
      colors: { background: '#000000', primary: '#ffffff' },
      typography: { fonts: { primary: "'Jost', sans-serif" } }
    };

    const theme = await loadTheme('/fake/theme.json', defaults);

    expect(theme.colors.background).toBe('#000000');
    expect(theme.colors.primary).toBe('#123456');
    expect(theme.typography.fonts.primary).toBe("'Jost', sans-serif");
  });

  it('loadTheme returns defaults clone on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));

    const { loadTheme } = await import('../../assets/js/script.js');

    const defaults = {
      colors: { background: '#111111' }
    };

    const theme = await loadTheme('/fake/theme.json', defaults);

    expect(theme).toEqual(defaults);
    expect(theme).not.toBe(defaults);
  });
});