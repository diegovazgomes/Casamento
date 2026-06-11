const ADMIN_SUPABASE_STORAGE_KEY = 'admin-supabase-auth';
const ADMIN_ACCESS_TOKEN_STORAGE_KEY = 'admin-access-token';

const state = {
  authToken: null,
  supabaseClientPromise: null,
};

const authScreen = document.getElementById('authScreen');
const adminApp = document.getElementById('adminApp');
const authForm = document.getElementById('authForm');
const authError = document.getElementById('authError');
const statusText = document.getElementById('statusText');

document.addEventListener('DOMContentLoaded', () => {
  authForm?.addEventListener('submit', handleLogin);
  document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
  document.getElementById('refreshButton')?.addEventListener('click', loadAdminData);
  initializeAdmin();
});

async function initializeAdmin() {
  try {
    const token = await ensureAccessToken();
    if (!token) {
      showAuth();
      return;
    }

    showApp();
    await loadAdminData();
  } catch (error) {
    console.warn('[admin] Falha ao inicializar painel.', error);
    await clearSession();
    showAuth();
  }
}

async function getSupabaseClient() {
  if (!state.supabaseClientPromise) {
    state.supabaseClientPromise = (async () => {
      const waitStart = Date.now();
      while (!window.supabase?.createClient && Date.now() - waitStart < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!window.supabase?.createClient) {
        throw new Error('SDK do Supabase não carregado.');
      }

      const response = await fetch('/api/event-config?mode=client-config', { cache: 'no-store' });
      const config = await response.json().catch(() => ({}));
      if (!response.ok || !config?.supabaseUrl || !config?.supabaseAnonKey) {
        throw new Error(config.error || 'Supabase não configurado para autenticação.');
      }

      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storage: window.sessionStorage,
          storageKey: ADMIN_SUPABASE_STORAGE_KEY,
        },
      });

      client.auth.onAuthStateChange((_event, session) => {
        const accessToken = session?.access_token || null;
        state.authToken = accessToken;
        if (accessToken) {
          sessionStorage.setItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY, accessToken);
        } else {
          sessionStorage.removeItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY);
        }
      });

      return client;
    })();
  }

  return state.supabaseClientPromise;
}

async function ensureAccessToken() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  let token = data?.session?.access_token || sessionStorage.getItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY) || null;
  if (!token && data?.session?.refresh_token) {
    const refreshed = await supabase.auth.refreshSession();
    token = refreshed.data?.session?.access_token || null;
  }

  state.authToken = token;
  if (token) sessionStorage.setItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY, token);
  return token;
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value.trim();
  if (!email || !password) return;

  setAuthError('');
  setStatus('Autenticando...');

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session?.access_token) {
      setAuthError(normalizeAuthError(error?.message));
      return;
    }

    state.authToken = data.session.access_token;
    sessionStorage.setItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY, state.authToken);
    authForm.reset();
    showApp();
    await loadAdminData();
  } catch (error) {
    setAuthError(error.message || 'Não foi possível autenticar.');
  }
}

async function handleLogout() {
  await clearSession();
  showAuth();
}

async function clearSession() {
  state.authToken = null;
  sessionStorage.removeItem(ADMIN_ACCESS_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_SUPABASE_STORAGE_KEY);

  try {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('[admin] Não foi possível encerrar a sessão.', error);
  } finally {
    state.supabaseClientPromise = null;
  }
}

async function fetchAdminAction(action) {
  const token = state.authToken || await ensureAccessToken();
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await fetch(`/api/dashboard/profile?action=${encodeURIComponent(action)}&ts=${Date.now()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível carregar os dados administrativos.');
  }
  return data;
}

async function loadAdminData() {
  setStatus('Carregando dados...');

  try {
    const [overview, acquisition, productUsage] = await Promise.all([
      fetchAdminAction('admin-overview'),
      fetchAdminAction('admin-acquisition'),
      fetchAdminAction('admin-product-usage'),
    ]);

    renderOverview(overview);
    renderAcquisition(overview, acquisition);
    renderProductUsage(productUsage);
    setStatus(`Atualizado em ${formatDateTime(new Date().toISOString())}`);
  } catch (error) {
    console.warn('[admin] Falha ao carregar dados.', error);
    if (/administrativo|autorizado|unauthorized|sess/i.test(error.message || '')) {
      await clearSession();
      showAuth();
      setAuthError(error.message || 'Acesso administrativo não autorizado.');
      return;
    }
    setStatus(error.message || 'Erro ao carregar dados.');
  }
}

function renderOverview(data) {
  const summary = data?.summary || {};
  setText('statAccounts', formatNumber(summary.totalAccounts));
  setText('statAccountsHint', `${formatNumber(summary.accountsLast30Days)} nos últimos 30 dias`);
  setText('statPremium', formatNumber(summary.premiumAccounts));
  setText('statPremiumHint', `${formatNumber(summary.premiumConversionRate)}% de conversão`);
  setText('statEvents', formatNumber(summary.activeEvents));
  setText('statEventsHint', `${formatNumber(summary.totalEvents)} eventos criados`);
  setText('statRevenue', formatMoney(summary.revenueTotal, summary.currency));
  setText('statRevenueHint', `${formatMoney(summary.revenueLast30Days, summary.currency)} nos últimos 30 dias`);
  setText('statFree', formatNumber(summary.freeAccounts));
  setText('statDemo', formatNumber(summary.demoAccounts));
  setText('statInviteViews', formatNumber(summary.totalInviteViews));

  renderRows('latestAccountsBody', 'latestAccountsEmpty', data.latestAccounts, (account) => `
    <tr>
      <td><span class="strong">${escapeHtml(account.coupleName)}</span></td>
      <td>${escapeHtml(account.email)}</td>
      <td><span class="pill">${escapeHtml(account.plan)}</span></td>
      <td>${formatDate(account.createdAt)}</td>
    </tr>
  `);

  renderRows('latestPaymentsBody', 'latestPaymentsEmpty', data.latestPayments, (payment) => `
    <tr>
      <td><span class="pill">${escapeHtml(payment.plan)}</span></td>
      <td><span class="strong">${formatMoney(payment.amountTotal, payment.currency)}</span></td>
      <td>${formatDate(payment.processedAt)}</td>
    </tr>
  `);

  renderRows('latestEventsBody', 'latestEventsEmpty', data.latestEvents, (event) => `
    <tr>
      <td><span class="strong">${escapeHtml(event.couple_names || 'Sem nome')}</span></td>
      <td>${escapeHtml(event.slug || '-')}</td>
      <td>${escapeHtml(event.active_theme || '-')}</td>
      <td>${escapeHtml(event.active_layout || '-')}</td>
      <td><span class="pill">${event.is_active ? 'ativo' : 'inativo'}</span></td>
    </tr>
  `);
}

function renderAcquisition(overview, acquisition) {
  void overview;
  const summary = acquisition?.summary || {};
  const landingViews = Number(summary.landingViews || 0);
  const landingClicks = Number(summary.landingClicks || 0);
  const signupStarts = Number(summary.signupStarts || 0);
  const signupCompleted = Number(summary.signupCompleted || 0);
  const checkoutStarts = Number(summary.checkoutStarts || 0);
  const exampleViews = Number(summary.exampleViews || 0);
  const landingEngagementCount = Number(summary.landingEngagementCount || 0);

  setText('statLandingViews', formatNumber(landingViews));
  setText('statLandingViewsHint', `${formatNumber(landingClicks)} CTA clicks`);
  setText('statLandingDuration', formatDuration(summary.landingAverageDurationSeconds || 0));
  setText('statLandingDurationHint', `${formatNumber(landingEngagementCount)} visitas com permanencia medida`);
  setText('statSignupStarted', formatNumber(signupStarts));
  setText('statSignupStartedHint', `${formatNumber(signupCompleted)} concluidos`);
  setText('statCheckoutStarted', formatNumber(checkoutStarts));
  setText('statCheckoutStartedHint', `${formatNumber(exampleViews)} visitas ao exemplo`);

  const funnelRows = [
    { label: 'Landing views', count: landingViews, conversion: 100 },
    { label: 'CTA clicks', count: landingClicks, conversion: summary.clickThroughRate || 0 },
    { label: 'Signup started', count: signupStarts, conversion: landingViews > 0 ? roundPercent(signupStarts / landingViews) : 0 },
    { label: 'Signup completed', count: signupCompleted, conversion: summary.signupCompletionRate || 0 },
    { label: 'Checkout started', count: checkoutStarts, conversion: signupCompleted > 0 ? roundPercent(checkoutStarts / signupCompleted) : 0 },
  ];

  const funnelBody = document.getElementById('funnelBody');
  if (funnelBody) {
    funnelBody.innerHTML = funnelRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td><span class="strong">${formatNumber(row.count)}</span></td>
        <td>${formatPercent(row.conversion)}</td>
      </tr>
    `).join('');
  }

  renderBarRows('sourceBody', acquisition?.bySource || []);
  renderBarRows('deviceBody', acquisition?.byDevice || []);
}

function renderProductUsage(data) {
  renderSimpleMetricRows('themesBody', data?.topThemes || [], 'value', 'count');

  const features = data?.features || {};
  const featureRows = [
    { label: 'RSVP habilitado', value: features.rsvpEnabled || 0 },
    { label: 'Presentes configurados', value: features.giftEnabled || 0 },
    { label: 'Pix configurado', value: features.pixConfigured || 0 },
    { label: 'Cartão habilitado', value: features.cardEnabled || 0 },
    { label: 'Galeria preenchida', value: features.galleryConfigured || 0 },
    { label: 'Páginas extras', value: features.extraPagesEnabled || 0 },
  ];

  const body = document.getElementById('featuresBody');
  if (body) {
    body.innerHTML = featureRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td><span class="strong">${formatNumber(row.value)}</span></td>
      </tr>
    `).join('');
  }
}

function renderSimpleMetricRows(bodyId, rows, labelKey, valueKey) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  body.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(row[labelKey])}</td>
        <td><span class="strong">${formatNumber(row[valueKey])}</span></td>
      </tr>
    `).join('')
    : '<tr><td colspan="2">Nenhum dado encontrado.</td></tr>';
}

function renderBarRows(bodyId, rows) {
  const body = document.getElementById(bodyId);
  if (!body) return;

  const total = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  body.innerHTML = rows.length
    ? rows.map((row) => {
      const share = total > 0 ? (Number(row.count) / total) * 100 : 0;
      return `
        <tr>
          <td>${escapeHtml(row.value)}</td>
          <td><span class="strong">${formatNumber(row.count)}</span></td>
          <td>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, share)}%"></div></div>
          </td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="3">Nenhum dado encontrado.</td></tr>';
}

function renderRows(bodyId, emptyId, rows = [], renderRow) {
  const body = document.getElementById(bodyId);
  const empty = document.getElementById(emptyId);
  if (!body) return;
  body.innerHTML = rows.map(renderRow).join('');
  if (empty) empty.hidden = rows.length > 0;
}

function showAuth() {
  authScreen.hidden = false;
  adminApp.hidden = true;
}

function showApp() {
  authScreen.hidden = true;
  adminApp.hidden = false;
}

function setAuthError(message) {
  if (!authError) return;
  authError.textContent = message || '';
  authError.hidden = !message;
}

function setStatus(message) {
  if (statusText) statusText.textContent = message;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? '';
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

function formatMoney(cents, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency || 'BRL',
  }).format((Number(cents) || 0) / 100);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(seconds) {
  const value = Number(seconds) || 0;
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  if (!rest) return `${minutes}min`;
  return `${minutes}min ${rest}s`;
}

function roundPercent(value) {
  return Math.round((Number(value) || 0) * 1000) / 10;
}

function formatPercent(value) {
  return `${formatNumber(value)}%`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeAuthError(message) {
  const normalized = String(message || '').toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de acessar.';
  }
  return 'Não foi possível autenticar.';
}
