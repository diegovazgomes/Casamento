/**
 * Endpoint: POST /api/auth/signup
 * Cadastro de novo casal na plataforma SaaS.
 *
 * Request body:
 *   {
 *     couple_name: string,   // Nome do casal, ex: "Ana & João"
 *     email: string,         // Email de acesso
 *     whatsapp: string,      // WhatsApp do casal (apenas dígitos)
 *     password: string       // Senha mínima 8 caracteres
 *   }
 *
 * Response 201:
 *   { ok: true, message: "Cadastro realizado. Verifique seu e-mail." }
 *
 * Response 400:
 *   { error: "mensagem de validação" }
 *
 * Response 409:
 *   { error: "E-mail já cadastrado." }
 *
 * Response 500:
 *   { error: "Erro interno ao criar conta." }
 */

import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../_lib/supabase-server.js';

const WHATSAPP_RE = /^\d{10,15}$/;
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

function validateBody({ couple_name, email, whatsapp, password }) {
  if (!couple_name || String(couple_name).trim().length < 2) {
    return 'Nome do casal deve ter pelo menos 2 caracteres.';
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return 'E-mail inválido.';
  }
  if (!whatsapp || !WHATSAPP_RE.test(String(whatsapp).replace(/\D/g, ''))) {
    return 'WhatsApp inválido. Informe apenas dígitos (10 a 15).';
  }
  if (!password || String(password).length < 8) {
    return 'Senha deve ter no mínimo 8 caracteres.';
  }
  return null;
}

function getAuthSignupClient() {
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

function resolveEmailRedirectTo(req) {
  const explicitAppUrl = process.env.APP_URL || process.env.SITE_URL || process.env.PUBLIC_SITE_URL || process.env.SUPABASE_EMAIL_REDIRECT_TO;

  if (explicitAppUrl) {
    if (/^https?:\/\//i.test(explicitAppUrl)) {
      return `${explicitAppUrl.replace(/\/$/, '')}/confirm.html`;
    }
    return explicitAppUrl;
  }

  // Sem redirect explícito: Supabase usa o Site URL configurado no projeto Auth.
  return '';
}

function normalizeAuthErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();

  if (!message) {
    return '';
  }

  if (message.includes('already registered') || message.includes('already exists')) {
    return 'E-mail já cadastrado.';
  }

  if (message.includes('email signups are disabled')) {
    return 'Cadastro por e-mail está desativado no Supabase Auth.';
  }

  if (message.includes('captcha')) {
    return 'Falha na validação anti-bot. Verifique a configuração de CAPTCHA no Supabase.';
  }

  if (
    message.includes('weak password') ||
    message.includes('password should be at least') ||
    message.includes('password is too weak') ||
    message.includes('password not strong enough')
  ) {
    return 'A senha informada é fraca. Use pelo menos 8 caracteres, com letras e números.';
  }

  if (message.includes('redirect') && message.includes('not allowed')) {
    return 'URL de redirecionamento de confirmação não permitida no Supabase Auth.';
  }

  if (message.includes('error sending confirmation email')) {
    return 'Não foi possível enviar o e-mail de confirmação. Verifique SMTP/Resend no Supabase.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Credenciais inválidas para operação de autenticação.';
  }

  return '';
}

function normalizeUnexpectedErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();

  if (!message) {
    return '';
  }

  if (message.includes('fetch failed') || message.includes('network') || message.includes('getaddrinfo')) {
    return 'Falha de conexão com o Supabase. Verifique SUPABASE_URL e conectividade do ambiente.';
  }

  return '';
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildDefaultEventSlug(coupleName, userId) {
  const baseSlug = slugify(coupleName) || 'casal';
  const userSuffix = slugify(String(userId || '').slice(0, 8)) || Date.now().toString(36);
  return `${baseSlug}-${userSuffix}`;
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'];

function deriveDateLabels(dateOnly) {
  const parsed = new Date(`${dateOnly}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return {
      heroDate: '',
      detailDate: '',
      displayDate: '',
      weekday: '',
    };
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const monthIndex = parsed.getMonth();
  const monthNumber = String(monthIndex + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return {
    heroDate: `${day} . ${monthNumber} . ${year}`,
    detailDate: `${day} ${MONTHS_SHORT[monthIndex]} ${year}`,
    displayDate: `${day} de ${MONTHS_FULL[monthIndex]} de ${year}`,
    weekday: WEEKDAYS[parsed.getDay()],
  };
}

function buildInitialEventConfig({ coupleName, slug, whatsapp }) {
  const eventDate = new Date().toISOString().slice(0, 10);
  const dateLabels = deriveDateLabels(eventDate);

  return {
    activeTheme: 'classic-gold',
    activeLayout: 'classic',
    couple: {
      names: coupleName || 'Novo Casal',
    },
    event: {
      date: `${eventDate}T17:00:00-03:00`,
      heroDate: dateLabels.heroDate,
      detailDate: dateLabels.detailDate,
      displayDate: dateLabels.displayDate,
      weekday: dateLabels.weekday,
      time: '17:00',
      locationName: 'Definir local',
      venueAddress: 'Definir endereço',
      mapsLink: '',
    },
    rsvp: {
      eventId: slug,
      supabaseEnabled: true,
    },
    whatsapp: {
      destinationPhone: whatsapp || '',
    },
    gift: {
      pixEnabled: false,
      cardPaymentEnabled: false,
    },
  };
}

function buildInitialEventTableFields() {
  return {
    event_date: new Date().toISOString().slice(0, 10),
    event_time: '17:00',
    venue_name: 'Definir local',
    venue_address: 'Definir endereço',
    venue_maps_link: '',
  };
}

async function seedDefaultEventGifts(supabase, eventId) {
  if (!eventId) {
    return;
  }

  try {
    const { data: existingRows, error: existingRowsError } = await supabase
      .from('event_gifts')
      .select('type')
      .eq('event_id', eventId);

    if (existingRowsError) {
      throw existingRowsError;
    }

    const existingTypes = new Set((existingRows || []).map((row) => String(row?.type || '')));
    const rowsToInsert = [];

    if (!existingTypes.has('pix')) {
      rowsToInsert.push({
        event_id: eventId,
        type: 'pix',
        enabled: false,
        sort_order: 1,
        config: {},
      });
    }

    if (!existingTypes.has('card')) {
      rowsToInsert.push({
        event_id: eventId,
        type: 'card',
        enabled: false,
        sort_order: 2,
        config: {},
      });
    }

    if (!rowsToInsert.length) {
      return;
    }

    const { error: insertError } = await supabase
      .from('event_gifts')
      .insert(rowsToInsert);

    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.warn('[signup] Falha ao criar presentes padrão do evento:', error?.message || error);
  }
}

async function ensureInitialEventForUser(supabase, { userId, coupleName, whatsapp }) {
  const { data: existingEvent, error: existingError } = await supabase
    .from('events')
    .select('id,slug')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingEvent) {
    return existingEvent;
  }

  const slug = buildDefaultEventSlug(coupleName, userId);
  const config = buildInitialEventConfig({ coupleName, slug, whatsapp });
  const seedFields = buildInitialEventTableFields();

  const { data: createdEvent, error: createError } = await supabase
    .from('events')
    .insert({
      slug,
      user_id: userId,
      couple_names: coupleName || 'Novo Casal',
      active_theme: 'classic-gold',
      active_layout: 'classic',
      ...seedFields,
      config,
    })
    .select('id,slug')
    .maybeSingle();

  if (createError) {
    throw createError;
  }

  await seedDefaultEventGifts(supabase, createdEvent?.id);

  return createdEvent;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const couple_name = String(body.couple_name || '').trim();
  const email       = String(body.email || '').trim().toLowerCase();
  const whatsapp    = String(body.whatsapp || '').replace(/\D/g, '');
  const password    = String(body.password || '');

  const validationError = validateBody({ couple_name, email, whatsapp, password });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const supabase = createSupabaseServerClient();
    const signUpClient = getAuthSignupClient();

    if (!supabase || !signUpClient) {
      return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
    }

    // 1. Criar usuário e disparar confirmação por e-mail
    const emailRedirectTo = resolveEmailRedirectTo(req);
    const signUpPayload = {
      email,
      password,
    };

    if (emailRedirectTo) {
      signUpPayload.options = { emailRedirectTo };
    }

    const { data: signUpData, error: signUpError } = await signUpClient.auth.signUp(signUpPayload);

    if (signUpError) {
      const normalizedMessage = normalizeAuthErrorMessage(signUpError);

      if (normalizedMessage) {
        const status = normalizedMessage === 'E-mail já cadastrado.' ? 409 : 400;
        console.error('[signup] Erro de cadastro mapeado:', {
          code: signUpError.code || null,
          providerMessage: signUpError.message || null,
        });
        return res.status(status).json({ error: normalizedMessage });
      }

      // Erro conhecido do provedor de auth sem mapeamento explícito.
      console.error('[signup] Erro ao criar usuário (não mapeado):', signUpError.message);
      return res.status(400).json({ error: 'Não foi possível concluir o cadastro. Tente novamente em instantes.' });
    }

    const userId = signUpData?.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'Não foi possível identificar o usuário após o cadastro.' });
    }

    // 2. Atualizar profile com dados do casal (trigger já criou o registro base)
    const clientIp = getClientIp(req);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        couple_name,
        whatsapp,
        lgpd_accepted_at: new Date().toISOString(),
        lgpd_ip: clientIp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      // Não bloqueia o cadastro, mas loga para investigação
      console.error('[signup] Erro ao atualizar profile:', profileError.message);
    }

    let initialEventWarning = null;
    try {
      await ensureInitialEventForUser(supabase, {
        userId,
        coupleName: couple_name,
        whatsapp,
      });
    } catch (initialEventError) {
      console.error('[signup] Erro ao inicializar evento do casal:', initialEventError?.message || initialEventError);
      initialEventWarning = 'Conta criada, mas não foi possível inicializar o evento automaticamente.';
    }

    return res.status(201).json({
      ok: true,
      message: 'Cadastro realizado com sucesso. Verifique seu e-mail para ativar a conta.',
      emailRedirectTo: emailRedirectTo || null,
      warning: initialEventWarning,
    });
  } catch (unexpectedError) {
    console.error('[signup] Erro inesperado:', unexpectedError?.message || unexpectedError);
    const normalizedMessage = normalizeUnexpectedErrorMessage(unexpectedError);
    if (normalizedMessage) {
      return res.status(503).json({ error: normalizedMessage });
    }

    return res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
}
