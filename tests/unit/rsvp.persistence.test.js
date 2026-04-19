import { beforeEach, describe, expect, it, vi } from 'vitest';

function createJsonResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

function createTextResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  global.fetch = vi.fn();
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    value: 'https://example.com/origem',
  });
});

describe('rsvp persistence', () => {
  it('salva mensagem em guest_submissions com type message', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({
        supabaseUrl: 'https://demo.supabase.co',
        supabaseAnonKey: 'anon-key',
      }))
      .mockResolvedValueOnce(createTextResponse('', true, 201));

    const { saveGuestMessage } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveGuestMessage({
      guestName: 'Ana',
      message: 'Parabens ao casal',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://demo.supabase.co/rest/v1/guest_submissions', expect.objectContaining({
      method: 'POST',
    }));

    const payload = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(payload).toMatchObject({
      type: 'message',
      guest_name: 'Ana',
      message: 'Parabens ao casal',
      event_id: 'evento-teste',
      source: 'mensagem-page',
    });
  });

  it('salva sugestao em guest_submissions com type song', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({
        supabaseUrl: 'https://demo.supabase.co',
        supabaseAnonKey: 'anon-key',
      }))
      .mockResolvedValueOnce(createTextResponse('', true, 201));

    const { saveSongSuggestion } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveSongSuggestion({
      guestName: 'Ana',
      songTitle: 'Velha Infancia',
      songArtist: 'Tribalistas',
      songNotes: 'Nossa cara',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://demo.supabase.co/rest/v1/guest_submissions', expect.objectContaining({
      method: 'POST',
    }));

    const payload = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(payload).toMatchObject({
      type: 'song',
      guest_name: 'Ana',
      song_title: 'Velha Infancia',
      song_artist: 'Tribalistas',
      song_notes: 'Nossa cara',
      event_id: 'evento-teste',
      source: 'musica-page',
    });
  });

  it('retorna false quando /api/config falha', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveRsvpConfirmation({
      name: 'Ana',
      phone: '11999999999',
      attendance: 'yes',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('retorna false quando /api/config responde sem credenciais', async () => {
    global.fetch.mockResolvedValueOnce(createJsonResponse({
      supabaseUrl: '',
      supabaseAnonKey: '',
    }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveRsvpConfirmation({
      name: 'Ana',
      phone: '11999999999',
      attendance: 'yes',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('nao envia colunas inexistentes no insert de RSVP', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({
        supabaseUrl: 'https://demo.supabase.co',
        supabaseAnonKey: 'anon-key',
      }))
      .mockResolvedValueOnce(createTextResponse('', true, 201));

    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveRsvpConfirmation({
      name: 'Ana',
      phone: '11999999999',
      attendance: 'yes',
      eventId: 'evento-teste',
      tokenId: 'token-1',
      groupName: 'Familia Silva',
      groupMaxConfirmations: 3,
      marketingConsent: true,
    });

    expect(saved).toBe(true);

    const payload = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(payload).toMatchObject({
      name: 'Ana',
      phone: '11999999999',
      attendance: 'yes',
      event_id: 'evento-teste',
      token_id: 'token-1',
      marketing_consent: true,
    });
    expect(payload).not.toHaveProperty('group_name');
    expect(payload).not.toHaveProperty('group_max_confirmations');
  });

  it('retorna false quando insert em guest_submissions falha', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({
        supabaseUrl: 'https://demo.supabase.co',
        supabaseAnonKey: 'anon-key',
      }))
      .mockResolvedValueOnce(createTextResponse('{"message":"insert failed"}', false, 400));

    const { saveGuestMessage } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveGuestMessage({
      guestName: 'Ana',
      message: 'Parabens',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});