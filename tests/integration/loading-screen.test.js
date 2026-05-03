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
    const {
      initLoadingScreen,
      applyEventDataToLoadingScreen,
    } = await import('../../assets/js/loading-screen.js');

    initLoadingScreen();
    applyEventDataToLoadingScreen({
      names: 'Ana & Leo',
      date: '2026-09-06T17:00:00',
    });

    // Data is populated but phase must NOT switch on first visit
    expect(document.getElementById('loadingInitialA')?.textContent).toBe('A');
    expect(document.getElementById('loadingInitialB')?.textContent).toBe('L');
    expect(document.getElementById('loadingEventDate')?.textContent).toBe('06 . 09 . 2026');
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(false);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(true);
  });

  it('stores couple data for the next visit without switching phase on first visit', async () => {
    const {
      initLoadingScreen,
      applyEventDataToLoadingScreen,
    } = await import('../../assets/js/loading-screen.js');

    initLoadingScreen();
    applyEventDataToLoadingScreen({
      names: 'Siannah & Diego',
      date: '2026-09-06T17:00:00',
    });

    expect(JSON.parse(window.sessionStorage.getItem('ls_couple'))).toEqual({
      first: 'S',
      second: 'D',
      date: '06 . 09 . 2026',
    });
    expect(window.sessionStorage.getItem('ls_data_ready')).toBe('1');
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(false);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(true);
  });

  it('keeps Devazi phase when couple name is a generic placeholder', async () => {
    const {
      initLoadingScreen,
      applyEventDataToLoadingScreen,
    } = await import('../../assets/js/loading-screen.js');

    initLoadingScreen();
    applyEventDataToLoadingScreen({
      names: 'Noiva & Noivo',
      date: '2026-09-06T17:00:00',
    });

    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(false);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(true);
  });
});

describe('loading screen — second visit (couple phase)', () => {
  it('shows couple phase immediately (no Devazi) on second visit with valid config', async () => {
    window.sessionStorage.setItem('ls_data_ready', '1');
    window.__LS_COUPLE_DATA__ = {
      first: 'A',
      second: 'L',
      date: '06 . 09 . 2026',
    };

    const { initLoadingScreen } = await import('../../assets/js/loading-screen.js');

    initLoadingScreen();

    // Couple phase visible immediately (Devazi never shown on second visit)
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(true);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(false);
    // Data is populated
    expect(document.getElementById('loadingInitialA')?.textContent).toBe('A');
    expect(document.getElementById('loadingInitialB')?.textContent).toBe('L');
    expect(document.getElementById('loadingEventDate')?.textContent).toBe('06 . 09 . 2026');
    expect(document.getElementById('loadingEventDate')?.closest('.bubble-content')).not.toBeNull();
    expect(document.querySelector('.loader-status-text')).toBeNull();
  });

  it('updates couple data while keeping the couple phase visible on second visit', async () => {
    window.sessionStorage.setItem('ls_data_ready', '1');

    const {
      initLoadingScreen,
      applyEventDataToLoadingScreen,
    } = await import('../../assets/js/loading-screen.js');

    initLoadingScreen();

    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(true);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(false);

    applyEventDataToLoadingScreen({
      names: 'Siannah & Diego',
      date: '2026-09-06T17:00:00',
    });

    // Couple phase still visible with updated names
    expect(document.getElementById('loadingInitialA')?.textContent).toBe('S');
    expect(document.getElementById('loadingInitialB')?.textContent).toBe('D');
    expect(document.getElementById('loadingPhaseBrand')?.hidden).toBe(true);
    expect(document.getElementById('loadingPhaseCouple')?.hidden).toBe(false);
  });
});
