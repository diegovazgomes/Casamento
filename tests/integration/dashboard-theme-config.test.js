import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

describe('dashboard theme/config bootstrap', () => {
  it('loads config defaults, active theme and typography for the dashboard', async () => {
    global.fetch = vi.fn(async (url) => {
      const responses = {
        'assets/config/defaults/theme.json': {
          colors: { background: '#101010', primary: '#aaaaaa' },
          typography: { fonts: { primary: "'Default Sans', sans-serif" } },
        },
        'assets/config/defaults/site.json': {
          activeLayout: 'classic',
          couple: { names: 'Default Couple' },
          rsvp: { eventId: 'default-event' },
        },
        'assets/config/site.json': {
          activeLayout: 'classic',
          activeTheme: 'assets/layouts/classic/themes/classic-silver.json',
          couple: { names: 'Siannah & Diego' },
          rsvp: { eventId: 'siannah-diego-2026' },
        },
        'assets/layouts/classic/themes/classic-silver.json': {
          meta: { name: 'Classic Silver' },
          colors: { primary: '#c0c0c0', text: '#f8f8f8' },
          typography: { fonts: { serif: "'Cormorant Garamond', serif" } },
        },
        'assets/config/typography.json': {
          typography: {
            families: {
              body: "'Jost', sans-serif",
            },
          },
        },
      };

      if (!(url in responses)) {
        throw new Error(`Unexpected fetch URL: ${url}`);
      }

      return {
        ok: true,
        json: async () => responses[url],
      };
    });

    const { loadDashboardThemeConfig } = await import('../../assets/js/dashboard-theme-config.js');
    const result = await loadDashboardThemeConfig();

    expect(result.config.couple.names).toBe('Siannah & Diego');
    expect(result.config.rsvp.eventId).toBe('siannah-diego-2026');
    expect(result.themePath).toBe('assets/layouts/classic/themes/classic-silver.json');
    expect(result.theme.colors.background).toBe('#101010');
    expect(result.theme.colors.primary).toBe('#c0c0c0');
    expect(result.theme.typography.families.body).toBe("'Jost', sans-serif");
    expect(result.theme.typography.fonts.serif).toBe("'Cormorant Garamond', serif");
  });

  it('resolves shorthand theme names and applies scoped theme overrides', async () => {
    global.fetch = vi.fn(async (url) => {
      const responses = {
        'assets/config/defaults/theme.json': {
          colors: { background: '#101010', primary: '#aaaaaa' },
          typography: { fonts: { primary: "'Default Sans', sans-serif" } },
          responsive: {},
        },
        'assets/config/defaults/site.json': {
          activeLayout: 'classic',
          couple: { names: 'Fallback Couple' },
          rsvp: { eventId: 'default-event' },
        },
        'assets/config/site.json': {
          activeLayout: 'classic',
          activeTheme: 'classic-purple',
          themeOverridesByTheme: {
            'classic-purple': {
              colors: { primary: '#6d5ce8' },
            },
          },
        },
        'assets/layouts/classic/themes/classic-purple.json': {
          colors: { primary: '#4b3fb8', text: '#ffffff' },
          typography: { fonts: { primary: "'Jost', sans-serif" } },
          responsive: {},
        },
        'assets/config/typography.json': {
          typography: { families: {} },
        },
      };

      if (!(url in responses)) {
        throw new Error(`Unexpected fetch URL: ${url}`);
      }

      return {
        ok: true,
        json: async () => responses[url],
      };
    });

    const { loadDashboardThemeConfig } = await import('../../assets/js/dashboard-theme-config.js');
    const result = await loadDashboardThemeConfig();

    expect(result.themePath).toBe('assets/layouts/classic/themes/classic-purple.json');
    expect(result.theme.colors.primary).toBe('#6d5ce8');
  });
});