/**
 * rsvp-persistence.js
 * Responsabilidade única: salvar confirmações no Supabase via Vercel Functions.
 * Não interfere com o fluxo do WhatsApp existente.
 * Falha silenciosamente — se o servidor estiver fora, o WhatsApp ainda funciona.
 */

const RSVP_RECORD_SESSION_KEY = 'rsvp-record-id';

function getStoredRecordId() {
    try {
        return sessionStorage.getItem(RSVP_RECORD_SESSION_KEY) || null;
    } catch {
        return null;
    }
}

function storeRecordId(id) {
    try {
        if (id) sessionStorage.setItem(RSVP_RECORD_SESSION_KEY, id);
    } catch {}
}

/**
 * Atualiza campos de uma linha existente via /api/update-rsvp (server-side PATCH).
 * Retorna true se atualizou, false se falhou.
 */
async function updateRecord(id, fields) {
    try {
        const res = await fetch('/api/update-rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, fields }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Salva uma confirmação de presença via /api/save-rsvp.
 * Armazena o ID da linha no sessionStorage para reuso por música e mensagem.
 * Nunca lança exceção — falha silenciosamente.
 */
export async function saveRsvpConfirmation({ name, phone, attendance, eventId, message = null, songTitle = null, songArtist = null, tokenId = null, groupName = null, groupMaxConfirmations = null, marketingConsent = false }) {
    try {
        const res = await fetch('/api/save-rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                phone,
                attendance,
                event_id:                eventId || 'wedding-event',
                source:                  'website',
                user_agent:              navigator.userAgent.slice(0, 200),
                referrer:                document.referrer.slice(0, 200) || null,
                message:                 message || null,
                song_title:              songTitle || null,
                song_artist:             songArtist || null,
                token_id:                tokenId || null,
                group_name:              groupName || null,
                group_max_confirmations: groupMaxConfirmations || null,
                marketing_consent:       marketingConsent,
            }),
        });

        if (!res.ok) {
            console.warn('[rsvp-persistence] Falha ao salvar. status:', res.status);
            return false;
        }

        const data = await res.json();
        storeRecordId(data.id);
        console.log('[rsvp-persistence] Registro salvo. id:', data.id);
        return true;
    } catch (error) {
        console.warn('[rsvp-persistence] Erro inesperado:', error.message);
        return false;
    }
}

/**
 * Salva uma mensagem do convidado para o casal.
 * Se já existe uma linha do RSVP na sessão, atualiza ela. Caso contrário, insere nova.
 * Nunca lança exceção — falha silenciosamente.
 */
export async function saveGuestMessage({ guestName, message, eventId }) {
    const existingId = getStoredRecordId();

    if (existingId) {
        console.log('[rsvp-persistence] Atualizando linha existente com mensagem. id:', existingId);
        return updateRecord(existingId, { message: message || null });
    }

    try {
        const res = await fetch('/api/save-rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name:       guestName || '',
                phone:      '',
                attendance: 'message',
                event_id:   eventId || 'wedding-event',
                source:     'mensagem-page',
                user_agent: navigator.userAgent.slice(0, 200),
                referrer:   document.referrer.slice(0, 200) || null,
                message:    message || null,
            }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Salva uma sugestão de música.
 * Se já existe uma linha do RSVP na sessão, atualiza ela. Caso contrário, insere nova.
 * Nunca lança exceção — falha silenciosamente.
 */
export async function saveSongSuggestion({ guestName, songTitle, songArtist, songNotes, eventId }) {
    const existingId = getStoredRecordId();

    if (existingId) {
        console.log('[rsvp-persistence] Atualizando linha existente com música. id:', existingId);
        return updateRecord(existingId, {
            song_title:  songTitle || null,
            song_artist: songArtist || null,
            song_notes:  songNotes || null,
        });
    }

    try {
        const res = await fetch('/api/save-rsvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
            }),
        });
        return res.ok;
    } catch {
        return false;
    }
}
