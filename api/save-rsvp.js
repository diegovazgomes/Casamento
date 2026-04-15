// api/save-rsvp.js
// Recebe os dados de confirmação do browser e insere no Supabase via service key.
// Retorna o ID da linha criada para que música e mensagem possam atualizar a mesma linha.

const ALLOWED_ATTENDANCE = new Set(['yes', 'no', 'message', 'song']);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'método não permitido' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(503).json({ error: 'serviço indisponível' });
    }

    const body = req.body ?? {};

    if (!body.attendance || !ALLOWED_ATTENDANCE.has(body.attendance)) {
        return res.status(400).json({ error: 'attendance inválido' });
    }

    const payload = {
        name:                     String(body.name ?? '').trim().slice(0, 300),
        phone:                    String(body.phone ?? '').trim().slice(0, 20),
        attendance:               body.attendance,
        event_id:                 String(body.event_id ?? 'wedding-event').slice(0, 100),
        source:                   String(body.source ?? 'website').slice(0, 50),
        user_agent:               String(body.user_agent ?? '').slice(0, 200),
        referrer:                 String(body.referrer ?? '').slice(0, 200) || null,
        message:                  body.message ? String(body.message).slice(0, 2000) : null,
        song_title:               body.song_title ? String(body.song_title).slice(0, 300) : null,
        song_artist:              body.song_artist ? String(body.song_artist).slice(0, 300) : null,
        song_notes:               body.song_notes ? String(body.song_notes).slice(0, 1000) : null,
        token_id:                 body.token_id || null,
        group_name:               body.group_name ? String(body.group_name).slice(0, 300) : null,
        group_max_confirmations:  Number.isInteger(body.group_max_confirmations) ? body.group_max_confirmations : null,
        marketing_consent:        body.marketing_consent === true,
        marketing_consent_at:     body.marketing_consent === true ? new Date().toISOString() : null,
    };

    try {
        const insertRes = await fetch(`${supabaseUrl}/rest/v1/rsvp_confirmations`, {
            method: 'POST',
            headers: {
                apikey: supabaseServiceKey,
                Authorization: `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: JSON.stringify(payload),
        });

        if (!insertRes.ok) {
            const err = await insertRes.text();
            console.error('[save-rsvp] erro ao inserir:', err);
            return res.status(502).json({ error: 'erro ao salvar' });
        }

        const rows = await insertRes.json();
        const id = Array.isArray(rows) ? rows[0]?.id : rows?.id;

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ id: id ?? null });
    } catch (err) {
        console.error('[save-rsvp] erro interno:', err);
        return res.status(500).json({ error: 'erro interno' });
    }
}
