import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('script config/theme loaders', () => {
  it('reads token and section directly from URL when bootstrap state is absent', async () => {
    const { readNavigationStateFromUrl } = await import('../../assets/js/script.js');

    const state = readNavigationStateFromUrl('https://example.com/index.html?section=extras&g=family-token');

    expect(state).toEqual({
      navigationTarget: 'extras',
      guestToken: 'family-token',
      shouldSkipIntro: true,
    });
  });

  it('builds internal URLs preserving only g when token exists', async () => {
    const { buildInternalUrl } = await import('../../assets/js/script.js');

    expect(buildInternalUrl('faq.html', 'family-token', 'https://example.com/index.html')).toBe('https://example.com/faq.html?g=family-token');
    expect(buildInternalUrl('index.html?section=extras', 'family-token', 'https://example.com/musica.html?g=old-token')).toBe('https://example.com/index.html?section=extras&g=family-token');
    expect(buildInternalUrl('index.html?section=extras', null, 'https://example.com/musica.html?g=old-token')).toBe('https://example.com/index.html?section=extras');
  });

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

  it('applies scoped theme overrides by active theme key', async () => {
    const { applySiteThemeOverrides } = await import('../../assets/js/script.js');

    const baseTheme = {
      colors: { primary: '#111111', background: '#222222' },
      typography: { sizes: { base: '13px' } }
    };

    const config = {
      activeTheme: 'assets/config/themes/classic-gold-light.json',
      themeOverridesByTheme: {
        'classic-gold-light': { colors: { primary: '#d4af37' } },
        'classic-purple': { colors: { primary: '#6d5ce8' } }
      }
    };

    const result = applySiteThemeOverrides(baseTheme, config, config.activeTheme);

    expect(result.colors.primary).toBe('#d4af37');
    expect(result.colors.background).toBe('#222222');
  });

  it('falls back to legacy global themeOverrides when scoped bucket is absent', async () => {
    const { applySiteThemeOverrides } = await import('../../assets/js/script.js');

    const baseTheme = {
      colors: { primary: '#111111' }
    };

    const config = {
      activeTheme: 'assets/config/themes/classic-gold-light.json',
      themeOverridesByTheme: {
        'classic-purple': { colors: { primary: '#6d5ce8' } }
      },
      themeOverrides: {
        colors: { primary: '#c0c0c0' }
      }
    };

    const result = applySiteThemeOverrides(baseTheme, config, config.activeTheme);

    expect(result.colors.primary).toBe('#c0c0c0');
  });

  it('extracts theme override key from theme path', async () => {
    const { getThemeOverrideKey } = await import('../../assets/js/script.js');

    expect(getThemeOverrideKey('assets/config/themes/classic-gold-light.json')).toBe('classic-gold-light');
    expect(getThemeOverrideKey('classic-purple.json')).toBe('classic-purple');
    expect(getThemeOverrideKey('')).toBe('');
  });
});