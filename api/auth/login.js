import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeAuthErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();

  if (!message) {
    return '';
  }

  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }

  if (message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de acessar o dashboard.';
  }

  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
  }

  if (message.includes('captcha')) {
    return 'Falha na validação anti-bot.';
  }

  return '';
}

function normalizeUnexpectedErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();

  if (!message) {
    return '';
  }

  if (message.includes('fetch failed') || message.includes('network') || message.includes('getaddrinfo')) {
    return 'Falha de conexão com o Supabase. Verifique a configuração do ambiente.';
  }

  return '';
}

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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Senha inválida.' });
  }

  const supabase = getSupabaseAuthClient();
  if (!supabase) {
    return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session?.access_token) {
      const normalizedMessage = normalizeAuthErrorMessage(error);
      if (normalizedMessage) {
        return res.status(400).json({ error: normalizedMessage });
      }

      return res.status(400).json({ error: 'Não foi possível autenticar. Verifique seu e-mail e senha.' });
    }

    return res.status(200).json({
      ok: true,
      session: data.session,
      user: {
        id: data.user?.id || null,
        email: data.user?.email || email,
      },
    });
  } catch (error) {
    console.error('[auth/login] Erro inesperado:', error?.message || error);
    const normalizedMessage = normalizeUnexpectedErrorMessage(error);
    if (normalizedMessage) {
      return res.status(503).json({ error: normalizedMessage });
    }

    return res.status(500).json({ error: 'Erro interno ao autenticar.' });
  }
}