/**
 * Endpoint: POST /api/auth/forgot-password
 * Envia e-mail de recuperação de senha via Supabase Auth.
 *
 * Request body:
 *   { email: string }
 *
 * Response 200:
 *   { ok: true }
 *
 * Sempre retorna 200 para não revelar se o e-mail existe (anti-enumeração).
 *
 * Response 400:
 *   { error: "E-mail inválido." }
 *
 * Response 500:
 *   { error: "Erro interno." }
 */

import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getResetRedirectTo() {
  const appUrl =
    process.env.APP_URL ||
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    '';

  if (appUrl && /^https?:\/\//i.test(appUrl)) {
    return `${appUrl.replace(/\/$/, '')}/reset-password.html`;
  }

  return '';
}

function getAnonClient() {
  const supabaseUrl    = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body  = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  try {
    const supabase = getAnonClient();

    if (!supabase) {
      return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
    }

    const redirectTo = getResetRedirectTo();
    const options    = redirectTo ? { redirectTo } : {};

    // Supabase não revela se o e-mail existe — retorna sucesso mesmo que não encontre.
    const { error } = await supabase.auth.resetPasswordForEmail(email, options);

    if (error) {
      console.error('[forgot-password] Supabase error:', error.message);
      // Não expõe detalhes do erro para o cliente (anti-enumeração)
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[forgot-password] Erro inesperado:', err?.message || err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
}
