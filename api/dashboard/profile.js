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
 *     is_demo_account: boolean,
 *     plan: "free" | "basic" | "premium",
 *     expires_at: string | null,
 *     created_at: string
 *   }
 *
 * Response 401: { error: "Unauthorized" }
 * Response 404: { error: "Profile não encontrado." }
 */

import { authenticateDashboardRequest } from '../_lib/dashboard-auth.js';

const ADMIN_ACTIONS = new Set([
  'admin-overview',
  'admin-accounts',
  'admin-events',
  'admin-revenue',
  'admin-acquisition',
  'admin-product-usage',
]);

function getAction(req) {
  return String(req?.query?.action || '').trim();
}

function toIsoDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function toCount(result) {
  if (result?.error) return 0;
  return Number(result?.count || 0);
}

function maskEmail(value) {
  const email = String(value || '').trim();
  const [name = '', domain = ''] = email.split('@');
  if (!name || !domain) return '';
  const visible = name.slice(0, 2);
  return `${visible}${name.length > 2 ? '***' : '*'}@${domain}`;
}

function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 4) return '';
  return `${digits.slice(0, 2)}*****${digits.slice(-4)}`;
}

function normalizeCurrency(value) {
  return String(value || 'brl').toUpperCase();
}

function sumAmounts(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row?.amount_total) || 0), 0);
}

function getConfigValue(config, path) {
  return String(path || '').split('.').reduce((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return current[key];
  }, config);
}

function countEnabledPageFeatures(events = []) {
  const counters = {
    rsvpEnabled: 0,
    giftEnabled: 0,
    pixConfigured: 0,
    cardEnabled: 0,
    galleryConfigured: 0,
    extraPagesEnabled: 0,
  };

  events.forEach((event) => {
    const config = event?.config || {};
    if (config?.rsvp?.supabaseEnabled !== false) counters.rsvpEnabled += 1;
    if (config?.gift?.catalog?.enabled === true || config?.gift?.catalogs?.activeKey || config?.gift?.pixKey) counters.giftEnabled += 1;
    if (String(config?.gift?.pixKey || '').trim()) counters.pixConfigured += 1;
    if (config?.gift?.cardPaymentEnabled === true && String(config?.gift?.cardPaymentLink || '').trim()) counters.cardEnabled += 1;

    const gallery = getConfigValue(config, 'pages.historia.content.gallery');
    if (Array.isArray(gallery) && gallery.length > 0) counters.galleryConfigured += 1;

    const pages = config?.pages || {};
    const enabledExtras = Object.values(pages).filter((page) => page?.enabled === true).length;
    if (enabledExtras > 0) counters.extraPagesEnabled += 1;
  });

  return counters;
}

function topCounts(rows = [], key, limit = 6) {
  const counts = new Map();
  rows.forEach((row) => {
    const value = String(row?.[key] || 'nao-informado').trim() || 'nao-informado';
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, limit);
}

function getMetadataNumber(row, key) {
  const value = row?.metadata?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function averageFromRows(rows = [], key) {
  if (!rows.length) return 0;
  const total = rows.reduce((sum, row) => sum + getMetadataNumber(row, key), 0);
  return total > 0 ? Math.round(total / rows.length) : 0;
}

function countByEventName(rows = []) {
  const counts = new Map();
  rows.forEach((row) => {
    const eventName = String(row?.event_name || '').trim();
    if (!eventName) return;
    counts.set(eventName, (counts.get(eventName) || 0) + 1);
  });
  return counts;
}

async function getAdminUser(auth) {
  const { data, error } = await auth.supabase
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function requireAdmin(auth) {
  const adminUser = await getAdminUser(auth);
  if (!adminUser) {
    return {
      ok: false,
      status: 403,
      error: 'Acesso administrativo nao autorizado.',
    };
  }

  return {
    ok: true,
    adminUser,
  };
}

async function safeQuery(label, queryPromise, fallback) {
  try {
    const result = await queryPromise;
    if (result?.error) {
      console.warn(`[admin/profile] Falha em ${label}:`, result.error.message);
      return fallback;
    }
    return result;
  } catch (error) {
    console.warn(`[admin/profile] Falha em ${label}:`, error.message);
    return fallback;
  }
}

async function buildAdminOverview(supabase) {
  const since30 = toIsoDateDaysAgo(30);

  const [
    totalProfiles,
    recentProfiles,
    freeProfiles,
    premiumProfiles,
    demoProfiles,
    totalEvents,
    activeEvents,
    guestViews,
    latestProfiles,
    latestEvents,
    paymentRows,
    latestPayments,
  ] = await Promise.all([
    safeQuery('total profiles', supabase.from('profiles').select('id', { count: 'exact', head: true }), { count: 0 }),
    safeQuery('recent profiles', supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since30), { count: 0 }),
    safeQuery('free profiles', supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'free'), { count: 0 }),
    safeQuery('premium profiles', supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'premium'), { count: 0 }),
    safeQuery('demo profiles', supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_demo_account', true), { count: 0 }),
    safeQuery('total events', supabase.from('events').select('id', { count: 'exact', head: true }), { count: 0 }),
    safeQuery('active events', supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_active', true), { count: 0 }),
    safeQuery('guest views', supabase.from('guest_views').select('id', { count: 'exact', head: true }), { count: 0 }),
    safeQuery('latest profiles', supabase.from('profiles').select('id,couple_name,email,plan,created_at').order('created_at', { ascending: false }).limit(8), { data: [] }),
    safeQuery('latest events', supabase.from('events').select('id,slug,couple_names,event_date,active_theme,active_layout,is_active,created_at,updated_at').order('created_at', { ascending: false }).limit(8), { data: [] }),
    safeQuery('payment rows', supabase.from('payment_events').select('amount_total,currency,processed_at,plan').limit(10000), { data: [] }),
    safeQuery('latest payments', supabase.from('payment_events').select('user_id,amount_total,currency,plan,processed_at').order('processed_at', { ascending: false }).limit(8), { data: [] }),
  ]);

  const payments = paymentRows?.data || [];
  const revenueTotal = sumAmounts(payments);
  const revenue30 = sumAmounts(payments.filter((payment) => String(payment?.processed_at || '') >= since30));
  const totalAccounts = toCount(totalProfiles);
  const premiumAccounts = toCount(premiumProfiles);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalAccounts,
      accountsLast30Days: toCount(recentProfiles),
      freeAccounts: toCount(freeProfiles),
      premiumAccounts,
      demoAccounts: toCount(demoProfiles),
      premiumConversionRate: totalAccounts > 0 ? Math.round((premiumAccounts / totalAccounts) * 1000) / 10 : 0,
      totalEvents: toCount(totalEvents),
      activeEvents: toCount(activeEvents),
      totalInviteViews: toCount(guestViews),
      totalPayments: payments.length,
      revenueTotal,
      revenueLast30Days: revenue30,
      currency: normalizeCurrency(payments[0]?.currency),
    },
    latestAccounts: (latestProfiles?.data || []).map((profile) => ({
      id: profile.id,
      coupleName: profile.couple_name || 'Sem nome',
      email: maskEmail(profile.email),
      plan: profile.plan || 'free',
      createdAt: profile.created_at,
    })),
    latestEvents: latestEvents?.data || [],
    latestPayments: (latestPayments?.data || []).map((payment) => ({
      userId: payment.user_id,
      amountTotal: Number(payment.amount_total) || 0,
      currency: normalizeCurrency(payment.currency),
      plan: payment.plan || 'premium',
      processedAt: payment.processed_at,
    })),
  };
}

async function buildAdminAccounts(supabase) {
  const [{ data: profiles = [] }, { data: events = [] }] = await Promise.all([
    safeQuery('admin accounts', supabase.from('profiles').select('id,couple_name,email,whatsapp,plan,expires_at,is_demo_account,created_at,updated_at').order('created_at', { ascending: false }).limit(200), { data: [] }),
    safeQuery('admin account events', supabase.from('events').select('id,user_id'), { data: [] }),
  ]);

  const eventCounts = new Map();
  events.forEach((event) => {
    const userId = event?.user_id;
    if (userId) eventCounts.set(userId, (eventCounts.get(userId) || 0) + 1);
  });

  return {
    accounts: profiles.map((profile) => ({
      id: profile.id,
      coupleName: profile.couple_name || 'Sem nome',
      email: maskEmail(profile.email),
      whatsapp: maskPhone(profile.whatsapp),
      plan: profile.plan || 'free',
      expiresAt: profile.expires_at,
      isDemoAccount: profile.is_demo_account === true,
      eventCount: eventCounts.get(profile.id) || 0,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    })),
  };
}

async function buildAdminEvents(supabase) {
  const [{ data: events = [] }, { data: profiles = [] }] = await Promise.all([
    safeQuery('admin events', supabase.from('events').select('id,slug,user_id,couple_names,event_date,active_theme,active_layout,is_active,created_at,updated_at').order('created_at', { ascending: false }).limit(200), { data: [] }),
    safeQuery('admin event profiles', supabase.from('profiles').select('id,plan'), { data: [] }),
  ]);

  const planByUser = new Map(profiles.map((profile) => [profile.id, profile.plan || 'free']));

  return {
    events: events.map((event) => ({
      ...event,
      ownerPlan: planByUser.get(event.user_id) || 'free',
    })),
  };
}

async function buildAdminRevenue(supabase) {
  const { data: payments = [] } = await safeQuery(
    'admin revenue',
    supabase.from('payment_events').select('user_id,amount_total,currency,plan,processed_at,event_type').order('processed_at', { ascending: false }).limit(500),
    { data: [] },
  );

  const revenueTotal = sumAmounts(payments);
  const paidPayments = payments.filter((payment) => Number(payment?.amount_total || 0) > 0);

  return {
    summary: {
      totalPayments: payments.length,
      paidPayments: paidPayments.length,
      revenueTotal,
      averageTicket: paidPayments.length > 0 ? Math.round(revenueTotal / paidPayments.length) : 0,
      currency: normalizeCurrency(payments[0]?.currency),
    },
    payments: payments.map((payment) => ({
      userId: payment.user_id,
      amountTotal: Number(payment.amount_total) || 0,
      currency: normalizeCurrency(payment.currency),
      plan: payment.plan || 'premium',
      eventType: payment.event_type,
      processedAt: payment.processed_at,
    })),
  };
}

async function buildAdminAcquisition(supabase) {
  const since30 = toIsoDateDaysAgo(30);
  const { data: events = [] } = await safeQuery(
    'admin acquisition',
    supabase.from('platform_events').select('event_name,page_path,utm_source,utm_campaign,device_type,created_at,metadata').gte('created_at', since30).limit(10000),
    { data: [] },
  );

  const counts = countByEventName(events);
  const byEvent = topCounts(events, 'event_name', 20);
  const bySource = topCounts(events, 'utm_source', 10);
  const byDevice = topCounts(events, 'device_type', 10);
  const landingEngagement = events.filter((event) => event?.event_name === 'page_engaged' && event?.metadata?.page_kind === 'landing');
  const signupEngagement = events.filter((event) => event?.event_name === 'page_engaged' && event?.metadata?.page_kind === 'signup');

  const landingViews = counts.get('landing_view') || 0;
  const landingClicks = counts.get('landing_cta_click') || 0;
  const exampleViews = counts.get('example_invite_view') || 0;
  const signupStarts = counts.get('signup_started') || 0;
  const signupCompleted = counts.get('signup_completed') || 0;
  const checkoutStarts = counts.get('checkout_started') || 0;

  return {
    periodDays: 30,
    totalEvents: events.length,
    summary: {
      landingViews,
      landingClicks,
      exampleViews,
      signupStarts,
      signupCompleted,
      checkoutStarts,
      landingEngagementCount: landingEngagement.length,
      signupEngagementCount: signupEngagement.length,
      landingAverageDurationSeconds: averageFromRows(landingEngagement, 'duration_seconds'),
      signupAverageDurationSeconds: averageFromRows(signupEngagement, 'duration_seconds'),
      clickThroughRate: landingViews > 0 ? Math.round((landingClicks / landingViews) * 1000) / 10 : 0,
      signupCompletionRate: signupStarts > 0 ? Math.round((signupCompleted / signupStarts) * 1000) / 10 : 0,
    },
    byEvent,
    bySource,
    byDevice,
  };
}

async function buildAdminProductUsage(supabase) {
  const { data: events = [] } = await safeQuery(
    'admin product usage',
    supabase.from('events').select('id,active_theme,active_layout,config').limit(10000),
    { data: [] },
  );

  return {
    totalEvents: events.length,
    topThemes: topCounts(events, 'active_theme', 8),
    topLayouts: topCounts(events, 'active_layout', 8),
    features: countEnabledPageFeatures(events),
  };
}

async function handleAdminAction(action, auth, res) {
  const admin = await requireAdmin(auth);
  if (!admin.ok) {
    return res.status(admin.status).json({ error: admin.error });
  }

  if (action === 'admin-overview') {
    return res.status(200).json(await buildAdminOverview(auth.supabase));
  }

  if (action === 'admin-accounts') {
    return res.status(200).json(await buildAdminAccounts(auth.supabase));
  }

  if (action === 'admin-events') {
    return res.status(200).json(await buildAdminEvents(auth.supabase));
  }

  if (action === 'admin-revenue') {
    return res.status(200).json(await buildAdminRevenue(auth.supabase));
  }

  if (action === 'admin-acquisition') {
    return res.status(200).json(await buildAdminAcquisition(auth.supabase));
  }

  if (action === 'admin-product-usage') {
    return res.status(200).json(await buildAdminProductUsage(auth.supabase));
  }

  return res.status(400).json({ error: 'Invalid admin action' });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateDashboardRequest(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const action = getAction(req);
  if (ADMIN_ACTIONS.has(action)) {
    try {
      return await handleAdminAction(action, auth, res);
    } catch (error) {
      console.error('[dashboard/profile] Erro na action admin:', error.message);
      return res.status(500).json({ error: 'Erro interno ao carregar dados administrativos.' });
    }
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id, couple_name, email, whatsapp, is_demo_account, plan, expires_at, created_at')
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
