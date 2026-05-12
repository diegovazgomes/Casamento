import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function resolveRedirectTo(req) {
  const explicitAppUrl = process.env.APP_URL || process.env.SITE_URL || process.env.PUBLIC_SITE_URL;

  if (explicitAppUrl) {
    return `${explicitAppUrl.replace(/\/$/, '')}/reset-password.html`;
  }

  const requestOrigin = String(req?.headers?.origin || '').trim();
  if (requestOrigin && /^https?:\/\//i.test(requestOrigin)) {
    return `${requestOrigin.replace(/\/$/, '')}/reset-password.html`;
  }

  return '';
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const supabase = getSupabaseAuthClient();
  if (!supabase) {
    return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
  }

  try {
    const redirectTo = resolveRedirectTo(req);
    const options = redirectTo ? { redirectTo } : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, options);

    if (error) {
      return res.status(400).json({ error: 'Não foi possível enviar o link de recuperação.' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[auth/forgot-password] Erro inesperado:', error?.message || error);
    return res.status(500).json({ error: 'Erro interno ao solicitar recuperação de senha.' });
  }
}