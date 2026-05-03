/**
 * Endpoint: GET /api/dashboard/profile
 * Retorna o perfil do casal autenticado.
 *
 * Headers:
 *   Authorization: Bearer <access_token>
 *
 * Response 200:
 *   {
 *     id: uuid,
 *     couple_name: string,
 *     email: string,
 *     whatsapp: string | null,
 *     plan: "free" | "basic" | "premium",
 *     expires_at: string | null,
 *     created_at: string
 *   }
 *
 * Response 401: { error: "Unauthorized" }
 * Response 404: { error: "Profile não encontrado." }
 */

import { authenticateDashboardRequest } from '../_lib/dashboard-auth.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateDashboardRequest(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id, couple_name, email, whatsapp, plan, expires_at, created_at')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) {
    console.error('[dashboard/profile] Erro ao buscar profile:', error.message);
    return res.status(500).json({ error: 'Erro interno ao buscar perfil.' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Profile não encontrado.' });
  }

  return res.status(200).json(data);
}
