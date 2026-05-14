// api/payments.js
// Consolida checkout e webhook do Stripe em um único serverless para respeitar o limite do Vercel Hobby.
//
// POST /api/payments?action=checkout  — cria Stripe Checkout Session (requer Bearer token)
// POST /api/payments?action=webhook   — recebe eventos do Stripe (valida assinatura)
//
// bodyParser desabilitado globalmente para permitir leitura do raw body no webhook.

import Stripe from 'stripe';
import { authenticateDashboardRequest } from './_lib/dashboard-auth.js';
import { createSupabaseServerClient } from './_lib/supabase-server.js';

export const config = { api: { bodyParser: false } };

const PREMIUM_PLAN_DURATION_MONTHS = 12;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-11-20.acacia' });
}

function getAppUrl(req) {
  const configured = process.env.APP_URL || process.env.SITE_URL || process.env.PUBLIC_SITE_URL || '';
  if (configured) return configured.replace(/\/$/, '');
  const protocol = req?.headers?.['x-forwarded-proto'] || 'https';
  const host = req?.headers?.host || 'localhost:3000';
  return `${protocol}://${host}`;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ─── CHECKOUT ────────────────────────────────────────────────────────────────

async function handleCheckout(req, res, rawBody) {
  const auth = await authenticateDashboardRequest(req);
  if (!auth.ok) {
    return res.status(auth.status || 401).json({ error: auth.error || 'Unauthorized' });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Pagamento indisponível. Tente novamente mais tarde.' });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return res.status(503).json({ error: 'Plano de pagamento não configurado.' });
  }

  const supabase = createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, couple_name, plan, stripe_customer_id')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return res.status(404).json({ error: 'Perfil não encontrado.' });
  }

  if (isPremiumPlan(profile.plan)) {
    return res.status(400).json({ error: 'Você já possui o plano Premium.' });
  }

  // Buscar evento mais recente para metadata
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Reutiliza Stripe Customer se já existe
  let stripeCustomerId = profile.stripe_customer_id || null;

  if (stripeCustomerId) {
    try {
      await stripe.customers.retrieve(stripeCustomerId);
    } catch {
      stripeCustomerId = null;
    }
  }

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profile.email || auth.user.email,
      name: profile.couple_name || undefined,
      metadata: { user_id: auth.user.id },
    });
    stripeCustomerId = customer.id;

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', auth.user.id);
  }

  const appUrl = getAppUrl(req);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard.html?payment=success`,
    cancel_url: `${appUrl}/dashboard.html?payment=cancelled`,
    metadata: {
      user_id: auth.user.id,
      event_id: event?.id || '',
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  return res.status(200).json({ url: session.url });
}

// ─── WEBHOOK ─────────────────────────────────────────────────────────────────

async function handleWebhook(req, res, rawBody) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe não configurado.' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ error: 'Webhook secret não configurado.' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'stripe-signature ausente.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[payments/webhook] Assinatura inválida:', err.message);
    return res.status(400).json({ error: `Webhook signature inválida: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    await processCheckoutCompleted(event);
  }

  return res.status(200).json({ received: true });
}

async function processCheckoutCompleted(event) {
  const session = event.data.object;
  const userId = session.metadata?.user_id;

  if (!userId) {
    console.error('[payments/webhook] checkout.session.completed sem user_id no metadata');
    return;
  }

  const supabase = createSupabaseServerClient();

  // Idempotência: ignora se evento já foi processado
  const { data: existing } = await supabase
    .from('payment_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existing) {
    console.log('[payments/webhook] Evento já processado, ignorando:', event.id);
    return;
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + PREMIUM_PLAN_DURATION_MONTHS);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan: 'premium',
      expires_at: expiresAt.toISOString(),
      stripe_customer_id: session.customer || null,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('[payments/webhook] Falha ao atualizar perfil:', updateError.message);
    return;
  }

  await supabase.from('payment_events').insert({
    user_id: userId,
    stripe_event_id: event.id,
    event_type: event.type,
    amount_total: session.amount_total,
    currency: session.currency,
    plan: 'premium',
  });

  console.log('[payments/webhook] Plano atualizado para premium:', userId);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function isPremiumPlan(plan) {
  return String(plan || '').trim().toLowerCase() === 'premium';
}

// ─── HANDLER PRINCIPAL ───────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = String(req.query?.action || '').trim();
  const rawBody = await readRawBody(req);

  try {
    if (action === 'checkout') {
      return await handleCheckout(req, res, rawBody);
    }

    if (action === 'webhook') {
      return await handleWebhook(req, res, rawBody);
    }

    return res.status(400).json({ error: 'action inválida. Use ?action=checkout ou ?action=webhook' });
  } catch (error) {
    console.error(`[payments/${action}] Erro inesperado:`, error.message);
    return res.status(500).json({ error: 'Erro interno.' });
  }
}
