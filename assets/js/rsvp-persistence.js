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

const SERVER_SUBMISSIONS_ENDPOINT = '/api/submissions';

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

function shouldFallbackToLegacySupabase(status) {
    return status === 401 || status === 403 || status === 404 || status === 405 || status === 500 || status === 503;
}

async function postToServer(table, payload) {
    try {
        const response = await fetch(SERVER_SUBMISSIONS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ table, payload }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            const parsedError = parseSupabaseError(errorText);

            return {
                ok: false,
                error: parsedError,
                shouldFallback: shouldFallbackToLegacySupabase(response.status),
            };
        }

        return { ok: true, error: null, shouldFallback: false };
    } catch (error) {
        return {
            ok: false,
            error: {
                code: null,
                message: error.message,
                details: '',
                hint: '',
            },
            shouldFallback: true,
        };
    }
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

function isUnsupportedRsvpColumnError(parsedError) {
    const haystack = [parsedError?.message, parsedError?.details, parsedError?.hint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return haystack.includes('group_name') || haystack.includes('group_max_confirmations');
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
    const payload = {
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
    };

    const firstAttempt = await postToSupabaseDetailed('rsvp_confirmations', payload);
    if (firstAttempt.ok) {
        return true;
    }

    if (!isUnsupportedRsvpColumnError(firstAttempt.error)) {
        return false;
    }

    console.warn('[rsvp-persistence] Colunas opcionais de grupo ausentes no schema atual. Reenviando RSVP sem colunas desnormalizadas.');

    const fallbackPayload = {
        ...payload,
        group_name: undefined,
        group_max_confirmations: undefined,
    };

    delete fallbackPayload.group_name;
    delete fallbackPayload.group_max_confirmations;

    const fallbackAttempt = await postToSupabaseDetailed('rsvp_confirmations', fallbackPayload);
    return fallbackAttempt.ok;
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
    const result = await postToSupabaseDetailed(table, payload);
    return result.ok;
}

async function postToSupabaseDetailed(table, payload) {
    const serverAttempt = await postToServer(table, payload);
    if (serverAttempt.ok) {
        return { ok: true, error: null };
    }

    if (!serverAttempt.shouldFallback) {
        console.warn(
            `[rsvp-persistence] Falha ao salvar via ${SERVER_SUBMISSIONS_ENDPOINT}.`,
            {
                code: serverAttempt.error?.code,
                message: serverAttempt.error?.message,
                details: serverAttempt.error?.details,
                hint: serverAttempt.error?.hint,
                table,
                type: payload?.type,
                source: payload?.source,
            }
        );

        return { ok: false, error: serverAttempt.error };
    }

    try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();

        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn('[rsvp-persistence] Supabase não configurado. Pulando persistência.');
            return { ok: false, error: { code: null, message: 'Supabase não configurado.', details: '', hint: '' } };
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

            return { ok: false, error: parsedError };
        }

        console.log(`[rsvp-persistence] Registro salvo em ${table}.`);
        return { ok: true, error: null };

    } catch (error) {
        console.warn('[rsvp-persistence] Erro inesperado:', error.message);
        return {
            ok: false,
            error: {
                code: null,
                message: error.message,
                details: '',
                hint: '',
            }
        };
    }
}
