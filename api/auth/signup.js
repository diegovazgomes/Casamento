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

function buildInitialEventConfig({ coupleName, slug, whatsapp }) {
  return {
    activeTheme: 'classic-gold',
    activeLayout: 'classic',
    couple: {
      names: coupleName || 'Novo Casal',
    },
    event: {
      date: `${new Date().toISOString().slice(0, 10)}T17:00:00-03:00`,
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

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
  }

  // 1. Criar usuário no Supabase Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // Supabase enviará e-mail de confirmação
  });

  if (signUpError) {
    // Erro de email duplicado
    if (
      signUpError.message?.toLowerCase().includes('already registered') ||
      signUpError.message?.toLowerCase().includes('already exists') ||
      signUpError.code === '23505'
    ) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }
    console.error('[signup] Erro ao criar usuário:', signUpError.message);
    return res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }

  const userId = signUpData?.user?.id;
  if (!userId) {
    return res.status(500).json({ error: 'Erro interno ao criar conta.' });
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

  try {
    await ensureInitialEventForUser(supabase, {
      userId,
      coupleName: couple_name,
      whatsapp,
    });
  } catch (initialEventError) {
    console.error('[signup] Erro ao inicializar evento do casal:', initialEventError?.message || initialEventError);
    return res.status(500).json({
      error: 'Conta criada, mas não foi possível inicializar o evento do casal.',
    });
  }

  return res.status(201).json({
    ok: true,
    message: 'Cadastro realizado com sucesso. Verifique seu e-mail para ativar a conta.',
  });
}
