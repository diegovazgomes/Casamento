// api/update-rsvp.js
// Atualiza campos de conteúdo em uma linha existente de rsvp_confirmations.
// Usado quando o convidado já confirmou presença e depois envia música ou mensagem.
// Restringe os campos atualizáveis para evitar abuso.

const ALLOWED_FIELDS = new Set(['message', 'song_title', 'song_artist', 'song_notes']);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'método não permitido' });
    }

    const { id, fields } = req.body ?? {};

    if (!id || typeof id !== 'string' || !fields || typeof fields !== 'object') {
        return res.status(400).json({ error: 'dados inválidos' });
    }

    // Filtra apenas campos permitidos
    const safeFields = Object.fromEntries(
        Object.entries(fields).filter(([key]) => ALLOWED_FIELDS.has(key))
    );

    if (Object.keys(safeFields).length === 0) {
        return res.status(400).json({ error: 'nenhum campo válido informado' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(503).json({ error: 'serviço indisponível' });
    }

    try {
        const patchRes = await fetch(
            `${supabaseUrl}/rest/v1/rsvp_confirmations?id=eq.${encodeURIComponent(id)}`,
            {
                method: 'PATCH',
                headers: {
                    apikey: supabaseServiceKey,
                    Authorization: `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                },
                body: JSON.stringify(safeFields),
            }
        );

        if (!patchRes.ok) {
            return res.status(502).json({ error: 'erro ao atualizar registro' });
        }

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ ok: true });
    } catch {
        return res.status(500).json({ error: 'erro interno' });
    }
}
