/**
 * rsvp-persistence.js
 * Responsabilidade única: salvar confirmações no Supabase.
 * Não interfere com o fluxo do WhatsApp existente.
 * Falha silenciosamente — se o Supabase estiver fora, o WhatsApp ainda funciona.
 */

let _config = null;

async function getConfig() {
    if (_config) return _config;
    try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _config = await res.json();
    } catch {
        _config = { supabaseUrl: null, supabaseAnonKey: null };
    }
    return _config;
}

/**
 * Salva uma confirmação de presença no Supabase.
 * Retorna true se salvou, false se falhou.
 * Nunca lança exceção — falha silenciosamente.
 *
 * @param {Object} data
 * @param {string} data.name - Nome do convidado
 * @param {string} data.phone - Telefone do convidado
 * @param {string} data.attendance - 'yes' ou 'no'
 * @param {string} data.eventId - ID do evento no site.json
 * @param {string|null} [data.message] - Mensagem do convidado para o casal (opcional)
 * @param {string|null} [data.songTitle] - Nome da música sugerida (opcional)
 * @param {string|null} [data.songArtist] - Artista da música sugerida (opcional)
 * @param {string|null} [data.tokenId] - UUID do token do grupo de convidados (opcional)
 * @param {boolean} [data.marketingConsent] - Consentimento de marketing LGPD (opcional)
 * @returns {Promise<boolean>}
 */
export async function saveRsvpConfirmation({ name, phone, attendance, eventId, message = null, songTitle = null, songArtist = null, tokenId = null, marketingConsent = false }) {
    return postToSupabase({
        name:                   name.trim(),
        phone:                  phone.trim(),
        attendance:             attendance,
        event_id:               eventId || 'wedding-event',
        source:                 'website',
        user_agent:             navigator.userAgent.slice(0, 200),
        referrer:               document.referrer.slice(0, 200) || null,
        message:                message || null,
        song_title:             songTitle || null,
        song_artist:            songArtist || null,
        token_id:               tokenId || null,
        marketing_consent:      marketingConsent,
        marketing_consent_at:   marketingConsent ? new Date().toISOString() : null,
    });
}

/**
 * Helper interno: executa o POST para o Supabase com o payload fornecido.
 * Falha silenciosamente em qualquer cenário de erro.
 *
 * @param {Object} payload - Campos a inserir na tabela rsvp_confirmations
 * @returns {Promise<boolean>}
 */
async function postToSupabase(payload) {
    try {
        console.log('[rsvp-persistence] postToSupabase chamado. attendance:', payload.attendance);

        const { supabaseUrl, supabaseAnonKey } = await getConfig();

        console.log('[rsvp-persistence] config carregado. url ok:', !!supabaseUrl, '| key ok:', !!supabaseAnonKey);

        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn('[rsvp-persistence] Supabase não configurado. Pulando persistência.');
            return false;
        }

        const response = await fetch(`${supabaseUrl}/rest/v1/rsvp_confirmations`, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'apikey':        supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Prefer':        'return=minimal',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('[rsvp-persistence] Falha ao salvar. status:', response.status, '| erro:', errorText);
            return false;
        }

        console.log('[rsvp-persistence] Registro salvo com sucesso. attendance:', payload.attendance);
        return true;

    } catch (error) {
        console.warn('[rsvp-persistence] Erro inesperado:', error.message);
        return false;
    }
}

/**
 * Salva uma mensagem de convidado para o casal no Supabase.
 * Falha silenciosamente — nunca lança exceção.
 *
 * @param {Object} data
 * @param {string} data.guestName - Nome do convidado (pode ser vazio)
 * @param {string} data.message - Texto da mensagem
 * @param {string} data.eventId - ID do evento
 * @returns {Promise<boolean>}
 */
export async function saveGuestMessage({ guestName, message, eventId }) {
    return postToSupabase({
        name:       guestName || '',
        phone:      '',
        attendance: 'message',
        event_id:   eventId || 'wedding-event',
        source:     'mensagem-page',
        user_agent: navigator.userAgent.slice(0, 200),
        referrer:   document.referrer.slice(0, 200) || null,
        message:    message || null,
    });
}

/**
 * Salva uma sugestão de música no Supabase.
 * Falha silenciosamente — nunca lança exceção.
 *
 * @param {Object} data
 * @param {string} data.guestName - Nome do convidado (pode ser vazio)
 * @param {string} data.songTitle - Nome da música
 * @param {string} data.songArtist - Artista (pode ser vazio)
 * @param {string} data.songNotes - Observações (pode ser vazio)
 * @param {string} data.eventId - ID do evento
 * @returns {Promise<boolean>}
 */
export async function saveSongSuggestion({ guestName, songTitle, songArtist, songNotes, eventId }) {
    return postToSupabase({
        name:        guestName || '',
        phone:       '',
        attendance:  'song',
        event_id:    eventId || 'wedding-event',
        source:      'musica-page',
        user_agent:  navigator.userAgent.slice(0, 200),
        referrer:    document.referrer.slice(0, 200) || null,
        song_title:  songTitle || null,
        song_artist: songArtist || null,
        song_notes:  songNotes || null,
    });
}
