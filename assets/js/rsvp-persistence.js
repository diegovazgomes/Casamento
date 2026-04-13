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
 * @returns {Promise<boolean>}
 */
export async function saveRsvpConfirmation({ name, phone, attendance, eventId, message = null, songTitle = null, songArtist = null }) {
    try {
        const { supabaseUrl, supabaseAnonKey } = await getConfig();

        if (!supabaseUrl || !supabaseAnonKey) {
            console.warn('[rsvp-persistence] Supabase não configurado. Pulando persistência.');
            return false;
        }

        const payload = {
            name:       name.trim(),
            phone:      phone.trim(),
            attendance: attendance,
            event_id:   eventId || 'wedding-event',
            source:     'website',
            user_agent:      navigator.userAgent.slice(0, 200),
            referrer:        document.referrer.slice(0, 200) || null,
            message:         message || null,
            song_title:      songTitle || null,
            song_artist:     songArtist || null,
        };

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
            console.warn('[rsvp-persistence] Falha ao salvar:', response.status, errorText);
            return false;
        }

        console.log('[rsvp-persistence] Confirmação salva com sucesso.');
        return true;

    } catch (error) {
        // Falha silenciosa — o WhatsApp ainda vai funcionar
        console.warn('[rsvp-persistence] Erro inesperado:', error.message);
        return false;
    }
}
