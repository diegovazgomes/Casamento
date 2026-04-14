// api/guest-token.js
// Endpoint público que retorna dados de um grupo de convidados pelo token.
// Usado pelo convite para personalizar saudação e exibir contador de vagas.
// Credenciais do Supabase ficam server-side — nunca expostas ao browser.

export default async function handler(req, res) {
    const { token } = req.query;

    if (!token || typeof token !== 'string' || token.length > 64) {
        return res.status(400).json({ error: 'token inválido' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(503).json({ error: 'serviço indisponível' });
    }

    try {
        // Busca o token e conta confirmações em paralelo
        const [tokenRes, countRes] = await Promise.all([
            fetch(
                `${supabaseUrl}/rest/v1/guest_tokens?token=eq.${encodeURIComponent(token)}&select=id,group_name,max_confirmations`,
                {
                    headers: {
                        apikey: supabaseServiceKey,
                        Authorization: `Bearer ${supabaseServiceKey}`,
                        Accept: 'application/json',
                    },
                }
            ),
            fetch(
                `${supabaseUrl}/rest/v1/rsvp_confirmations?select=id&attendance=eq.yes`,
                {
                    headers: {
                        apikey: supabaseServiceKey,
                        Authorization: `Bearer ${supabaseServiceKey}`,
                        Accept: 'application/json',
                        // Filtramos por token_id após buscar o id — feito abaixo
                    },
                }
            ),
        ]);

        if (!tokenRes.ok) {
            return res.status(502).json({ error: 'erro ao consultar banco' });
        }

        const tokens = await tokenRes.json();

        if (!Array.isArray(tokens) || tokens.length === 0) {
            return res.status(404).json({ error: 'token não encontrado' });
        }

        const guestToken = tokens[0];

        // Conta confirmações para este token
        const countFetch = await fetch(
            `${supabaseUrl}/rest/v1/rsvp_confirmations?token_id=eq.${guestToken.id}&attendance=eq.yes&select=id`,
            {
                headers: {
                    apikey: supabaseServiceKey,
                    Authorization: `Bearer ${supabaseServiceKey}`,
                    Accept: 'application/json',
                    Prefer: 'count=exact',
                },
            }
        );

        const confirmationCount = parseInt(
            countFetch.headers.get('content-range')?.split('/')[1] ?? '0',
            10
        );

        // Cache curto: dados mudam conforme convidados confirmam
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

        return res.status(200).json({
            token_id: guestToken.id,
            group_name: guestToken.group_name,
            max_confirmations: guestToken.max_confirmations,
            confirmation_count: isNaN(confirmationCount) ? 0 : confirmationCount,
        });
    } catch (err) {
        return res.status(500).json({ error: 'erro interno' });
    }
}
