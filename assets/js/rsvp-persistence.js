/**
 * rsvp-persistence.js
 * Salva dados no Supabase em 2 tabelas separadas:
 *   - rsvp_confirmations : confirmações de presença (yes/no)
 *   - guest_submissions  : mensagens e sugestões de música
 *   - guest_tokens       : gerenciado via painel, não escrito aqui
 *
 * Retorna false quando não consegue persistir.
 */

let _config = null;

async function getConfig() {
    if (_config) return _config;

    try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        _config = {
            supabaseUrl: data?.supabaseUrl || null,
            supabaseAnonKey: data?.supabaseAnonKey || null,
        };

        if (!_config.supabaseUrl || !_config.supabaseAnonKey) {
            console.warn('[rsvp-persistence] /api/config respondeu sem SUPABASE_URL ou SUPABASE_ANON_KEY. Verifique as variáveis de ambiente no deploy.');
        }
    } catch (error) {
        console.warn(`[rsvp-persistence] Não foi possível carregar /api/config: ${error.message}`);
        _config = { supabaseUrl: null, supabaseAnonKey: null };
    }

    return _config;
}

function parseSupabaseError(errorText) {
    if (!errorText) {
        return { code: null, message: '', details: '', hint: '' };
    }

    try {
        const parsed = JSON.parse(errorText);
        return {
            code: parsed?.code ?? null,
            message: parsed?.message ?? '',
            details: parsed?.details ?? '',
            hint: parsed?.hint ?? '',
        };
    } catch {
        return {
            code: null,
            message: String(errorText),
            details: '',
            hint: '',
        };
    }
}

function normalizeOptionalString(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
}

function normalizeOptionalInteger(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Salva uma confirmação de presença na tabela rsvp_confirmations.
 * Retorna true se salvou, false se falhou.
 *
 * @param {Object} data
 * @param {string}       data.name                  - Nome do convidado
 * @param {string}       data.phone                 - Telefone do convidado
 * @param {string}       data.attendance             - 'yes' ou 'no'
 * @param {string}       data.eventId               - ID do evento
 * @param {string|null}  [data.tokenId]             - UUID do token do grupo
 * @param {string|null}  [data.groupName]           - Nome do grupo (desnormalizado)
 * @param {number|null}  [data.groupMaxConfirmations] - Máximo do grupo (desnormalizado)
 * @param {boolean}      [data.marketingConsent]    - Consentimento LGPD
 * @returns {Promise<boolean>}
 */
export async function saveRsvpConfirmation({ name, phone, attendance, eventId, tokenId = null, groupName = null, groupMaxConfirmations = null, marketingConsent = false }) {
    return postToSupabase('rsvp_confirmations', {
        name:                     name.trim(),
        phone:                    phone.trim(),
        attendance:               attendance,
        event_id:                 eventId || 'wedding-event',
        source:                   'website',
        user_agent:               navigator.userAgent.slice(0, 200),
        referrer:                 document.referrer.slice(0, 200) || null,
        token_id:                 tokenId || null,
        group_name:               normalizeOptionalString(groupName),
        group_max_confirmations:  normalizeOptionalInteger(groupMaxConfirmations),
        marketing_consent:        marketingConsent,
        marketing_consent_at:     marketingConsent ? new Date().toISOString() : null,
    });
}

/**
 * Salva uma mensagem de convidado para o casal na tabela guest_submissions.
 *
 * @param {Object} data
 * @param {string} data.guestName - Nome do convidado (pode ser vazio)
 * @param {string} data.message   - Texto da mensagem
 * @param {string} data.eventId   - ID do evento
 * @returns {Promise<boolean>}
 */
export async function saveGuestMessage({ guestName, message, eventId }) {
    return postToSupabase('guest_submissions', {
        type:       'message',
        guest_name: String(guestName || '').trim(),
        message:    String(message || '').trim() || null,
        event_id:   eventId || 'wedding-event',
        source:     'mensagem-page',
        user_agent: navigator.userAgent.slice(0, 200),
        referrer:   document.referrer.slice(0, 200) || null,
    });
}

/**
 * Salva uma sugestão de música na tabela guest_submissions.
 *
 * @param {Object} data
 * @param {string} data.guestName  - Nome do convidado (pode ser vazio)
 * @param {string} data.songTitle  - Nome da música
 * @param {string} data.songArtist - Artista (pode ser vazio)
 * @param {string} data.songNotes  - Observações (pode ser vazio)
 * @param {string} data.eventId    - ID do evento
 * @returns {Promise<boolean>}
 */
export async function saveSongSuggestion({ guestName, songTitle, songArtist, songNotes, eventId }) {
    return postToSupabase('guest_submissions', {
        type:        'song',
        guest_name:  String(guestName || '').trim(),
        song_title:  String(songTitle || '').trim() || null,
        song_artist: String(songArtist || '').trim() || null,
        song_notes:  String(songNotes || '').trim() || null,
        event_id:    eventId || 'wedding-event',
        source:      'musica-page',
        user_agent:  navigator.userAgent.slice(0, 200),
        referrer:    document.referrer.slice(0, 200) || null,
    });
}

/**
 * Helper interno: executa o POST para o Supabase na tabela indicada.
 * Falha silenciosamente em qualquer cenário de erro.
 *
 * @param {string} table   - Nome da tabela no Supabase
 * @param {Object} payload - Campos a inserir
 * @returns {Promise<boolean>}
 */
async function postToSupabase(table, payload) {
    try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();

        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn('[rsvp-persistence] Supabase não configurado. Pulando persistência.');
            return false;
        }

        const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
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
            const parsedError = parseSupabaseError(errorText);

            console.warn(
                `[rsvp-persistence] Falha ao salvar em ${table}.`,
                {
                    status: response.status,
                    code: parsedError.code,
                    message: parsedError.message,
                    details: parsedError.details,
                    hint: parsedError.hint,
                    type: payload?.type,
                    source: payload?.source,
                }
            );

            return false;
        }

        console.log(`[rsvp-persistence] Registro salvo em ${table}.`);
        return true;

    } catch (error) {
        console.warn('[rsvp-persistence] Erro inesperado:', error.message);
        return false;
    }
}
