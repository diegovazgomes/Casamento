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
  it('salva mensagem em guest_submissions via /api/submissions', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({ ok: true }, true, 201));

    const { saveGuestMessage } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveGuestMessage({
      guestName: 'Ana',
      message: 'Parabens ao casal',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/submissions', expect.objectContaining({
      method: 'POST',
    }));

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.table).toBe('guest_submissions');

    const payload = requestBody.payload;
    expect(payload).toMatchObject({
      type: 'message',
      guest_name: 'Ana',
      message: 'Parabens ao casal',
      event_id: 'evento-teste',
      source: 'mensagem-page',
    });
  });

  it('salva sugestao em guest_submissions via /api/submissions', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({ ok: true }, true, 201));

    const { saveSongSuggestion } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveSongSuggestion({
      guestName: 'Ana',
      songTitle: 'Velha Infancia',
      songArtist: 'Tribalistas',
      songNotes: 'Nossa cara',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/submissions', expect.objectContaining({
      method: 'POST',
    }));

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.table).toBe('guest_submissions');

    const payload = requestBody.payload;
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

  it('faz fallback para Supabase direto quando /api/submissions está indisponível', async () => {
    global.fetch
      .mockResolvedValueOnce(createTextResponse('service unavailable', false, 503))
      .mockResolvedValueOnce(createJsonResponse({
        supabaseUrl: 'https://demo.supabase.co',
        supabaseAnonKey: 'anon-key',
      }))
      .mockResolvedValueOnce(createTextResponse('', true, 201));

    const { saveGuestMessage } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveGuestMessage({
      guestName: 'Ana',
      message: 'Parabens',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/config');
    expect(global.fetch).toHaveBeenNthCalledWith(3, 'https://demo.supabase.co/rest/v1/guest_submissions', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('retorna false quando /api/submissions falha com erro de validação', async () => {
    global.fetch.mockResolvedValueOnce(createJsonResponse({
      code: 'VALIDATION_ERROR',
      message: 'Invalid payload',
      details: '',
      hint: '',
    }, false, 400));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { saveGuestMessage } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveGuestMessage({
      guestName: 'Ana',
      message: 'Parabens',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('envia colunas de grupo no insert de RSVP quando informadas', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({ ok: true }, true, 201));

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
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.table).toBe('rsvp_confirmations');
    expect(requestBody.payload).toMatchObject({
      name: 'Ana',
      phone: '11999999999',
      attendance: 'yes',
      event_id: 'evento-teste',
      token_id: 'token-1',
      group_name: 'Familia Silva',
      group_max_confirmations: 3,
      marketing_consent: true,
    });
  });

  it('envia null para colunas de grupo quando RSVP nao e tokenizado', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({ ok: true }, true, 201));

    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveRsvpConfirmation({
      name: 'Ana',
      phone: '11999999999',
      attendance: 'no',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(true);

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    const payload = requestBody.payload;
    expect(payload).toMatchObject({
      token_id: null,
      group_name: null,
      group_max_confirmations: null,
    });
  });

  it('retorna false quando insert em guest_submissions falha no endpoint server', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({ message: 'insert failed' }, false, 400));

    const { saveGuestMessage } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveGuestMessage({
      guestName: 'Ana',
      message: 'Parabens',
      eventId: 'evento-teste',
    });

    expect(saved).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('reenvia o RSVP sem colunas opcionais quando backend retorna erro de schema legado', async () => {
    global.fetch
      .mockResolvedValueOnce(createJsonResponse({ message: 'Could not find the group_name column' }, false, 400))
      .mockResolvedValueOnce(createJsonResponse({ ok: true }, true, 201));

    const { saveRsvpConfirmation } = await import('../../assets/js/rsvp-persistence.js');
    const saved = await saveRsvpConfirmation({
      name: 'Ana',
      phone: '11999999999',
      attendance: 'yes',
      eventId: 'evento-teste',
      tokenId: 'token-1',
      groupName: 'Familia Silva',
      groupMaxConfirmations: 3,
    });

    expect(saved).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const fallbackRequestBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    const fallbackPayload = fallbackRequestBody.payload;
    expect(fallbackPayload.token_id).toBe('token-1');
    expect(fallbackPayload.group_name).toBeUndefined();
    expect(fallbackPayload.group_max_confirmations).toBeUndefined();
  });
});