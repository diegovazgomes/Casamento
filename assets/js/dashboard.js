/**
 * dashboard.js
 * Lógica e interação do painel de gerenciamento do casal
 */

// Estado
const state = {
  authToken: null,
  eventId: '',
  eventSlug: new URLSearchParams(window.location.search).get('slug') || null,
  userProfile: null,
  grupos: [],
  confirmacoes: [],
  allConfirmacoes: [],
  mensagens: [],
  musicas: [],
  currentPage: 1,
  editingGrupoId: null,
  grupoModalMode: 'group',
};

const LEGACY_DASHBOARD_TOKEN_STORAGE_KEY = 'dashboardToken';
const DASHBOARD_SUPABASE_STORAGE_KEY = 'dashboard-supabase-auth';
const DASHBOARD_ACCESS_TOKEN_STORAGE_KEY = 'dashboard-access-token';

let dashboardSupabaseClientPromise = null;
let loginLoadingHideTimer = null;
let galleryOrderSaveTimer = null;

function redirectRecoveryCallbackToResetPage() {
  const currentUrl = new URL(window.location.href);
  const hashParams = new URLSearchParams(currentUrl.hash.startsWith('#') ? currentUrl.hash.slice(1) : currentUrl.hash);
  const queryParams = new URLSearchParams(currentUrl.search);

  const hasCode = queryParams.has('code');
  const hasRecoveryType = hashParams.get('type') === 'recovery' || queryParams.get('type') === 'recovery';
  const hasRecoveryTokens = hashParams.has('access_token') || hashParams.has('refresh_token');
  const shouldRedirectToReset = hasRecoveryType && (hasCode || hasRecoveryTokens);

  if (!shouldRedirectToReset) {
    return false;
  }

  const nextSearch = queryParams.toString();
  const nextHash = hashParams.toString();
  const resetUrl = `reset-password.html${nextSearch ? `?${nextSearch}` : ''}${nextHash ? `#${nextHash}` : ''}`;
  window.location.replace(resetUrl);
  return true;
}

function sanitizeDashboardAuthUrlParams() {
  const currentUrl = new URL(window.location.href);
  const hashParams = new URLSearchParams(currentUrl.hash.startsWith('#') ? currentUrl.hash.slice(1) : currentUrl.hash);
  const queryParams = new URLSearchParams(currentUrl.search);
  const authKeys = ['access_token', 'refresh_token', 'type', 'code', 'error_code', 'error_description'];

  let changed = false;

  authKeys.forEach((key) => {
    if (hashParams.has(key)) {
      hashParams.delete(key);
      changed = true;
    }
    if (queryParams.has(key)) {
      queryParams.delete(key);
      changed = true;
    }
  });

  if (!changed) {
    return;
  }

  const nextSearch = queryParams.toString();
  const nextHash = hashParams.toString();
  const sanitizedUrl = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}${nextHash ? `#${nextHash}` : ''}`;
  history.replaceState(null, '', sanitizedUrl);
}

const TAB_LABELS = {
  overview: { tag: 'Visão Geral', title: 'Painel de controle' },
  grupos: { tag: 'Convites', title: 'Gestão de convites' },
  confirmacoes: { tag: 'Confirmações', title: 'Respostas recebidas' },
  mensagens: { tag: 'Mensagens', title: 'Recados dos convidados' },
  musicas: { tag: 'Músicas', title: 'Sugestões recebidas' },
  relatorios: { tag: 'Relatórios', title: 'Estatísticas por grupo' },
  export: { tag: 'Exportação', title: 'Baixar seus dados' },
  editar: { tag: 'Configurações', title: 'Editar evento' },
};

// DOM Elements
const authScreen = document.getElementById('authScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const authForm = document.getElementById('authForm');
const authError = document.getElementById('authError');
const logoutButton = document.getElementById('logoutButton');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();

  window.addEventListener('dashboard:config-ready', (event) => {
    applySiteConfig(event.detail?.config);
  });

  const siteConfig = window.__SITE_CONFIG__;
  if (siteConfig) {
    applySiteConfig(siteConfig);
  }

  bindUiEvents();
  setupModalListeners();
  setupDesktopDatePicker();
  syncActiveTab();
  maybeShowPaymentBanner();
});

function setupDesktopDatePicker() {
  const dateInput = document.getElementById('edEventDate');
  if (!dateInput) return;

  // Mantem o comportamento mobile intacto; melhora somente desktop.
  const isDesktop = window.matchMedia('(min-width: 761px)').matches;
  if (!isDesktop) return;

  const openPicker = () => {
    if (typeof dateInput.showPicker === 'function') {
      try {
        dateInput.showPicker();
      } catch (error) {
        // Alguns navegadores bloqueiam showPicker fora de gesto do usuario.
      }
    }
  };

  dateInput.addEventListener('click', openPicker);
  dateInput.addEventListener('focus', openPicker);
}

function notifyDashboardReady() {
  window.__DASHBOARD_READY__ = true;

  if (typeof window.__ON_DASHBOARD_READY__ === 'function') {
    try {
      window.__ON_DASHBOARD_READY__();
    } catch (error) {
      console.warn('[dashboard] Falha ao executar callback de pronto.', error);
    }
  }

  window.dispatchEvent(new CustomEvent('dashboard:ready'));
}

async function initializeDashboard() {
  try {
    if (redirectRecoveryCallbackToResetPage()) {
      return;
    }

    sanitizeDashboardAuthUrlParams();

    const bootstrapPromise = window.__DASHBOARD_BOOTSTRAP_PROMISE__;
    if (bootstrapPromise && typeof bootstrapPromise.then === 'function') {
      try {
        const bootstrap = await bootstrapPromise;
        applySiteConfig(bootstrap?.config);
      } catch (error) {
        console.warn('[dashboard] Falha ao aguardar bootstrap de config.', error);
      }
    }

    sessionStorage.removeItem(LEGACY_DASHBOARD_TOKEN_STORAGE_KEY);

    const savedToken = await ensureDashboardAccessToken();
    if (savedToken) {
      try {
        await hydrateDashboardEventContext();
        await loadAllData();
        showDashboard();
      } catch (error) {
        console.error('[dashboard] Falha ao hidratar evento com token salvo.', error);
        await clearDashboardSession();
        showAuthScreen();
        showAuthError(normalizeDashboardAuthMessage(error?.message || 'Não foi possível conectar ao evento no Supabase.'));
      }
      notifyDashboardReady();
      return;
    }

    showAuthScreen();
    notifyDashboardReady();
  } catch (error) {
    console.error('[dashboard] Falha ao inicializar autenticação do dashboard.', error);
    await clearDashboardSession();
    showAuthScreen();
    showAuthError(normalizeDashboardAuthMessage(error?.message || 'Não foi possível inicializar a autenticação do dashboard.'));
    notifyDashboardReady();
  }
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function bindUiEvents() {
  authForm.addEventListener('submit', handleAuth);
  logoutButton.addEventListener('click', handleLogout);
  document.getElementById('btnUpgrade')?.addEventListener('click', handleUpgrade);
  
  // Tab switching
  document.querySelectorAll('.nav-item[data-tab]').forEach(button => {
    button.addEventListener('click', handleTabSwitch);
  });

  // Modais
  document.getElementById('btnNewGroup').addEventListener('click', () => openGroupModal('group'));
  document.getElementById('btnNewSingleInvite')?.addEventListener('click', () => openGroupModal('individual'));
  document.getElementById('btnDownloadCsv').addEventListener('click', handleDownloadCsv);
  document.getElementById('btnRefresh')?.addEventListener('click', () => {
    refreshActiveTab();
  });
  // Debounce busca por texto para evitar múltiplas requisições
  const filterSearch = document.getElementById('filterSearch');
  if (filterSearch) {
    filterSearch.addEventListener('input', debounce(reloadConfirmacoes, 350));
  }

  const filterMensagemSearch = document.getElementById('filterMensagemSearch');
  if (filterMensagemSearch) {
    filterMensagemSearch.addEventListener('input', debounce(reloadMensagens, 350));
  }

  const filterMusicaSearch = document.getElementById('filterMusicaSearch');
  if (filterMusicaSearch) {
    filterMusicaSearch.addEventListener('input', debounce(reloadMusicas, 350));
  }
}

function applySiteConfig(siteConfig) {
  if (!siteConfig || typeof siteConfig !== 'object') {
    return;
  }

  const coupleNames = siteConfig?.couple?.names;
  const heroDate = siteConfig?.event?.heroDate || siteConfig?.event?.displayDate || '';

  const sidebarCouple = document.getElementById('sidebarCouple');
  const sidebarDate = document.getElementById('sidebarDate');
  if (sidebarCouple && coupleNames) sidebarCouple.textContent = coupleNames;
  if (sidebarDate && heroDate) sidebarDate.textContent = heroDate;
}

async function hydrateDashboardEventContext() {
  const slugQuery = state.eventSlug ? `?slug=${encodeURIComponent(state.eventSlug)}` : '';
  const response = await fetchWithAuth(`/api/dashboard/event${slugQuery}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível carregar o evento do dashboard');
  }

  if (data?.event?.id) {
    state.eventId = data.event.id;
  }

  if (data?.event?.slug) {
    syncDashboardEventSlug(data.event.slug);
  }

  if (data?.config) {
    window.__SITE_JSON__ = window.__SITE_CONFIG__;
    window.__SITE_CONFIG__ = data.config;
    applySiteConfig(data.config);
  }

  return data;
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

async function handleAuth(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) return;

  // Mostrar tela de loading
  const loginLoadingScreen = document.getElementById('loginLoadingScreen');
  if (loginLoadingScreen) {
    if (loginLoadingHideTimer) {
      clearTimeout(loginLoadingHideTimer);
      loginLoadingHideTimer = null;
    }
    loginLoadingScreen.classList.remove('is-hiding');
    loginLoadingScreen.removeAttribute('hidden');
  }
  setLoginLoadingProgress(0);

  try {
    authError.style.display = 'none';
    
    // Progresso 20% - autenticação iniciada
    setLoginLoadingProgress(20);
    const supabase = await getDashboardSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session?.access_token) {
      hideLoginLoadingScreen();
      showAuthError(normalizeDashboardAuthMessage(error?.message || 'Erro na autenticação'));
      return;
    }

    // Progresso 40% - autenticado
    setLoginLoadingProgress(40);
    state.authToken = data.session.access_token;
    sessionStorage.setItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY, state.authToken);
    sessionStorage.setItem(DASHBOARD_SUPABASE_STORAGE_KEY, JSON.stringify(data.session));

    // Limpar form
    authForm.reset();

    try {
      // Progresso 60% - carregando contexto do evento
      setLoginLoadingProgress(60);
      await hydrateDashboardEventContext();
      
      // Progresso 80% - carregando dados
      setLoginLoadingProgress(80);
      await loadAllData();
    } catch (hydrateError) {
      hideLoginLoadingScreen();
      console.error('[auth] Falha ao hidratar dashboard após login', hydrateError);
      await clearDashboardSession();
      showAuthScreen();
      showAuthError(hydrateError?.message || 'Não foi possível carregar os dados do evento.');
      notifyDashboardReady();
      return;
    }

    // Progresso 100% - completo
    setLoginLoadingProgress(100);
    
    // Mostrar dashboard
    showDashboard();

    // Esconder tela de loading após transição
    setTimeout(() => {
      hideLoginLoadingScreen();
    }, 300);

    // Exibir nome do casal e plano vindos do profile (não-bloqueante)
    fetchUserProfile().then(profile => {
      if (profile?.couple_name) {
        const sidebarCouple = document.getElementById('sidebarCouple');
        if (sidebarCouple) sidebarCouple.textContent = profile.couple_name;
      }
      renderPlanBadge(profile);
    }).catch(() => {});

    notifyDashboardReady();
  } catch (error) {
    hideLoginLoadingScreen();
    console.error('[auth]', error);
    showAuthError(normalizeDashboardAuthMessage(error?.message || 'Erro ao conectar ao servidor'));
    notifyDashboardReady();
  }
}

function setLoginLoadingProgress(percent) {
  const progressBar = document.getElementById('loginLoadingProgress');
  const progressPercent = document.getElementById('loginLoadingPercent');
  const progressTrack = document.querySelector('.login-loading-track[role="progressbar"]');
  const progressStage = document.getElementById('loginLoadingStage');
  const clampedPercent = Math.max(0, Math.min(100, Number(percent) || 0));

  let stageLabel = 'Iniciando autenticação...';
  if (clampedPercent >= 100) {
    stageLabel = 'Finalizando acesso...';
  } else if (clampedPercent >= 80) {
    stageLabel = 'Carregando painel e confirmações...';
  } else if (clampedPercent >= 60) {
    stageLabel = 'Sincronizando evento...';
  } else if (clampedPercent >= 40) {
    stageLabel = 'Validando sessão...';
  } else if (clampedPercent >= 20) {
    stageLabel = 'Conectando com segurança...';
  }

  if (progressBar) {
    progressBar.style.width = `${clampedPercent}%`;
  }
  if (progressPercent) {
    progressPercent.textContent = `${clampedPercent}%`;
  }
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', String(clampedPercent));
  }
  if (progressStage) {
    progressStage.textContent = stageLabel;
  }
}

function hideLoginLoadingScreen() {
  const loginLoadingScreen = document.getElementById('loginLoadingScreen');
  if (!loginLoadingScreen) {
    return;
  }

  if (loginLoadingHideTimer) {
    clearTimeout(loginLoadingHideTimer);
    loginLoadingHideTimer = null;
  }

  loginLoadingScreen.classList.add('is-hiding');
  loginLoadingHideTimer = setTimeout(() => {
    loginLoadingScreen.setAttribute('hidden', '');
    loginLoadingScreen.classList.remove('is-hiding');
    loginLoadingHideTimer = null;
  }, 360);
}

function normalizeDashboardAuthMessage(message) {
  const rawMessage = String(message || '').trim();
  const normalized = rawMessage.toLowerCase();

  if (!normalized) {
    return 'Não foi possível autenticar. Tente novamente.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos. Confira os dados e tente novamente.';
  }

  if (normalized.includes('e-mail ou senha inválidos')) {
    return 'E-mail ou senha inválidos. Confira os dados e tente novamente.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de acessar o dashboard.';
  }

  if (normalized.includes('confirme seu e-mail')) {
    return 'Confirme seu e-mail antes de acessar o dashboard.';
  }

  if (normalized.includes('falha de conexão com o supabase')) {
    return 'Falha de conexão com o Supabase. Verifique a configuração do ambiente.';
  }

  if (normalized.includes('too many requests') || normalized.includes('rate limit')) {
    return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
  }

  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('getaddrinfo')
  ) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }

  if (normalized.includes('jwt') || normalized.includes('token') || normalized.includes('session')) {
    return 'Sua sessão expirou. Faça login novamente.';
  }

  return 'Não foi possível autenticar no momento. Tente novamente.';
}

async function handleLogout() {
  await clearDashboardSession();
  state.grupos = [];
  state.confirmacoes = [];
  state.allConfirmacoes = [];
  showAuthScreen();
  authForm.reset();
}

async function getDashboardSupabaseClient() {
  if (!dashboardSupabaseClientPromise) {
    dashboardSupabaseClientPromise = (async () => {
      // Aguarda carregamento assíncrono do SDK para evitar erro intermitente na primeira abertura.
      const waitStart = Date.now();
      while (!window.supabase?.createClient && Date.now() - waitStart < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!window.supabase?.createClient) {
        throw new Error('SDK do Supabase não carregado no dashboard');
      }

      const response = await fetch('/api/event-config?mode=client-config');
      const config = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(config.error || 'Não foi possível carregar a configuração pública do Supabase');
      }

      if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
        throw new Error('Supabase não configurado para autenticação do dashboard');
      }

      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storage: window.sessionStorage,
          storageKey: DASHBOARD_SUPABASE_STORAGE_KEY,
        },
      });

      client.auth.onAuthStateChange((_event, session) => {
        const accessToken = session?.access_token || null;
        state.authToken = accessToken;

        if (accessToken) {
          sessionStorage.setItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY, accessToken);
        } else {
          sessionStorage.removeItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY);
        }
      });

      return client;
    })();
  }

  return dashboardSupabaseClientPromise;
}

async function ensureDashboardAccessToken() {
  const supabase = await getDashboardSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  let accessToken = data?.session?.access_token || null;
  const refreshToken = data?.session?.refresh_token || null;

  if (!accessToken) {
    accessToken = sessionStorage.getItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY) || null;
  }

  if (!accessToken && refreshToken) {
    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw refreshError;
    }

    accessToken = refreshedData?.session?.access_token || null;
  }

  state.authToken = accessToken;

  if (accessToken) {
    sessionStorage.setItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY, accessToken);
  }

  return accessToken;
}

async function getDashboardAccessToken() {
  const token = state.authToken || await ensureDashboardAccessToken();

  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente no dashboard.');
  }

  return token;
}

async function clearDashboardSession() {
  state.authToken = null;
  state.userProfile = null;
  sessionStorage.removeItem(LEGACY_DASHBOARD_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(DASHBOARD_SUPABASE_STORAGE_KEY);
  sessionStorage.removeItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY);

  try {
    const supabase = await getDashboardSupabaseClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('[dashboard] Não foi possível encerrar a sessão Supabase.', error);
  }
}

async function fetchUserProfile() {
  if (state.userProfile) {
    return state.userProfile;
  }

  const token = state.authToken;
  if (!token) return null;

  try {
    const response = await fetch('/api/dashboard/profile', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const profile = await response.json();
    state.userProfile = profile;
    return profile;
  } catch {
    return null;
  }
}

function isPremiumPlan(planValue) {
  return String(planValue || '').trim().toLowerCase() === 'premium';
}

function renderPlanBadge(profile) {
  const container = document.getElementById('sidebarPlan');
  const nameEl = document.getElementById('sidebarPlanName');
  const btnUpgrade = document.getElementById('btnUpgrade');
  if (!container || !nameEl) return;

  const plan = String(profile?.plan || 'free');
  nameEl.textContent = isPremiumPlan(plan) ? 'Premium' : 'Free';
  container.hidden = false;

  if (btnUpgrade) {
    btnUpgrade.hidden = isPremiumPlan(plan);
  }
}

async function handleUpgrade() {
  const btn = document.getElementById('btnUpgrade');
  if (btn) { btn.disabled = true; btn.textContent = 'Aguarde...'; }

  try {
    const token = state.authToken;
    if (!token) throw new Error('Sessão expirada.');

    const res = await fetch('/api/payments?action=checkout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
    }

    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    alert(err.message || 'Erro ao iniciar pagamento. Tente novamente.');
    if (btn) { btn.disabled = false; btn.textContent = 'Fazer upgrade para Premium'; }
  }
}

function maybeShowPaymentBanner() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  if (!payment) return;

  // Remove o parâmetro da URL sem recarregar
  params.delete('payment');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
  history.replaceState(null, '', newUrl);

  if (payment === 'success') {
    const banner = document.createElement('div');
    banner.className = 'payment-banner';
    banner.innerHTML = '✓ Pagamento confirmado! Seu plano Premium está ativo.';
    const main = document.querySelector('.main') || document.body;
    main.prepend(banner);
    setTimeout(() => banner.remove(), 8000);

    // Recarrega o perfil para refletir o novo plano
    state.userProfile = null;
    fetchUserProfile().then(renderPlanBadge).catch(() => {});
  }
}

async function ensureUserProfileLoaded() {
  if (state.userProfile) {
    return state.userProfile;
  }

  const profile = await fetchUserProfile();
  return profile || null;
}

function showAuthError(message) {
  authError.textContent = message;
  authError.hidden = false;
  authError.style.display = 'block';
}

function showAuthScreen() {
  authScreen.style.display = 'flex';
  dashboardScreen.style.display = 'none';
  dashboardScreen.classList.remove('is-active');
}

function showDashboard() {
  authScreen.style.display = 'none';
  dashboardScreen.style.display = '';
  dashboardScreen.classList.add('is-active');
  maybeShowWizard(window.__SITE_CONFIG__);
}

// ============================================================
// TABS
// ============================================================

function handleTabSwitch(event) {
  const tabButton = event.currentTarget ?? event.target.closest('.nav-item[data-tab]');
  const tabName = tabButton?.dataset.tab;
  if (!tabName) return;
  
  // Remover active de todos
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn => btn.classList.remove('is-active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('is-active'));
  
  // Adicionar active
  tabButton.classList.add('is-active');
  document.getElementById(`tab-${tabName}`)?.classList.add('is-active');
  updateTopbar(tabName);
  syncTabActions(tabName);

  // Carregar dados específicos se necessário
  if (tabName === 'confirmacoes') {
    reloadConfirmacoes();
  } else if (tabName === 'mensagens') {
    reloadMensagens();
  } else if (tabName === 'musicas') {
    reloadMusicas();
  } else if (tabName === 'relatorios') {
    loadRelatorios();
  } else if (tabName === 'editar') {
    loadEditorTab();
  }
}

function refreshActiveTab() {
  const activeTab = document.querySelector('.nav-item.is-active')?.dataset.tab || 'overview';
  if (activeTab === 'confirmacoes') {
    reloadConfirmacoes();
    return;
  }

  if (activeTab === 'mensagens') {
    reloadMensagens();
    return;
  }

  if (activeTab === 'musicas') {
    reloadMusicas();
    return;
  }

  if (activeTab === 'relatorios') {
    loadRelatorios();
    return;
  }

  if (activeTab === 'editar') {
    loadEditorTab();
    return;
  }

  loadAllData();
}

function syncActiveTab() {
  const activeTab = document.querySelector('.nav-item.is-active')?.dataset.tab || 'overview';
  updateTopbar(activeTab);
  syncTabActions(activeTab);
}

function updateTopbar(tabName) {
  const cfg = TAB_LABELS[tabName];
  if (!cfg) return;

  const topbarTag = document.getElementById('topbarTag');
  const topbarTitle = document.getElementById('topbarTitle');

  if (topbarTag) topbarTag.textContent = cfg.tag;
  if (topbarTitle) topbarTitle.textContent = cfg.title;
}

function syncTabActions(tabName) {
  const btnNewGroup = document.getElementById('btnNewGroup');
  if (btnNewGroup) btnNewGroup.hidden = tabName !== 'grupos';

  const btnNewSingleInvite = document.getElementById('btnNewSingleInvite');
  if (btnNewSingleInvite) btnNewSingleInvite.hidden = tabName !== 'grupos';

  const btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) btnRefresh.hidden = tabName === 'editar';
}

function applyGrupoModalMode(mode = 'group') {
  const normalizedMode = mode === 'individual' ? 'individual' : 'group';
  state.grupoModalMode = normalizedMode;

  const isIndividual = normalizedMode === 'individual';
  const titleEl = document.getElementById('modalGrupoTitle');
  const tagEl = document.getElementById('modalGrupoTag');
  const submitTextEl = document.getElementById('modalGrupoSubmitText');
  const nameLabelEl = document.getElementById('grupoNameLabel');
  const vagasLabelEl = document.getElementById('grupoMaxConfirmationsLabel');
  const nameInput = document.getElementById('grupoName');
  const maxInput = document.getElementById('grupoMaxConfirmations');

  if (isIndividual) {
    if (titleEl) titleEl.textContent = 'Criar convite individual';
    if (tagEl) tagEl.textContent = 'Convite individual';
    if (submitTextEl) submitTextEl.textContent = 'Criar convite individual';
    if (nameLabelEl) nameLabelEl.textContent = 'Nome do convidado *';
    if (vagasLabelEl) vagasLabelEl.textContent = 'Vagas (fixo em 1)';
    if (nameInput) nameInput.placeholder = 'Ex: Maria Silva';
    if (maxInput) {
      maxInput.value = '1';
      maxInput.readOnly = true;
      maxInput.setAttribute('aria-readonly', 'true');
    }
    return;
  }

  if (titleEl) titleEl.textContent = state.editingGrupoId ? 'Editar grupo' : 'Novo grupo';
  if (tagEl) tagEl.textContent = 'Convite em grupo';
  if (submitTextEl) submitTextEl.textContent = 'Salvar grupo';
  if (nameLabelEl) nameLabelEl.textContent = 'Nome do grupo *';
  if (vagasLabelEl) vagasLabelEl.textContent = 'Vagas *';
  if (nameInput) nameInput.placeholder = 'Ex: Família Silva';
  if (maxInput) {
    maxInput.readOnly = false;
    maxInput.removeAttribute('aria-readonly');
  }
}

function openGroupModal(mode = 'group') {
  state.editingGrupoId = null;
  document.getElementById('formGrupo')?.reset();
  applyGrupoModalMode(mode);
  openModal('modalGrupo');
}

// ============================================================
// GRUPOS
// ============================================================

async function loadGrupos() {
  const container = document.getElementById('gruposTable');
  const loading = document.getElementById('gruposLoading');
  const empty = document.getElementById('gruposEmpty');
  const body = document.getElementById('gruposBody');

  loading.style.display = 'flex';
  container.hidden = true;
  empty.hidden = true;

  try {
    const response = await fetchWithAuth(`/api/dashboard/guest-groups?eventId=${state.eventId}`);
    if (!response.ok) throw new Error(response.statusText);
    
    const data = await response.json();
    state.grupos = data.data || [];

    if (state.grupos.length === 0) {
      empty.hidden = false;
      loading.style.display = 'none';
      updateOverview();
      return;
    }

    // Renderizar tabela
    body.innerHTML = state.grupos.map(grupo => {
      const hasPhone = !!grupo.phone;
      const phoneDisabledAttr = hasPhone ? '' : ' disabled title="Telefone não cadastrado"';
      const phoneDisabledClass = hasPhone ? '' : ' style="opacity:0.35;cursor:not-allowed"';
      return `
      <tr>
        <td>
          <div class="cell-name">${escapeHtml(grupo.group_name)}</div>
          <div class="cell-sub">Link gerado</div>
        </td>
        <td>
          <span class="cell-count">${grupo.confirmationCount}</span>
          <span class="cell-count-sep">/</span>
          <span class="cell-count">${grupo.max_confirmations}</span>
          <div class="cell-sub">${Math.max(grupo.slotsAvailable, 0)} vaga(s) restante(s)</div>
        </td>
        <td><span class="cell-sub">${escapeHtml(grupo.notes || '—')}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn"${phoneDisabledAttr}${phoneDisabledClass} onclick="${hasPhone ? `sendInviteWhatsApp('${escapeHtmlAttribute(grupo.id)}')` : ''}" aria-label="Enviar convite para ${escapeHtml(grupo.group_name)}" title="${hasPhone ? 'Enviar convite por WhatsApp' : 'Telefone não cadastrado'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>
              <span class="icon-btn-label">Convidar</span>
            </button>
            <button class="icon-btn"${phoneDisabledAttr}${phoneDisabledClass} onclick="${hasPhone ? `copyInviteWhatsAppMessage('${escapeHtmlAttribute(grupo.id)}', this)` : ''}" aria-label="Copiar texto do convite de ${escapeHtml(grupo.group_name)}" title="${hasPhone ? 'Copiar texto do convite' : 'Telefone não cadastrado'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span class="icon-btn-label">Copiar texto</span>
            </button>
            <button class="icon-btn" onclick="editGrupo('${grupo.id}')" aria-label="Editar grupo ${escapeHtml(grupo.group_name)}" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              <span class="icon-btn-label">Editar</span>
            </button>
            <button class="icon-btn danger" onclick="deleteGrupo('${grupo.id}')" aria-label="Excluir grupo ${escapeHtml(grupo.group_name)}" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              <span class="icon-btn-label">Excluir</span>
            </button>
          </div>
        </td>
      </tr>
    `}).join('');

    loading.style.display = 'none';
    container.hidden = false;
    updateOverview();
  } catch (error) {
    console.error('[loadGrupos]', error);
    loading.innerHTML = '<p style="color: #c33;">Erro ao carregar grupos</p>';
  }
}

function editGrupo(grupoId) {
  const grupo = state.grupos.find(g => g.id === grupoId);
  if (!grupo) return;

  state.editingGrupoId = grupoId;
  document.getElementById('modalGrupoTitle').textContent = 'Editar Grupo';
  document.getElementById('grupoName').value = grupo.group_name;
  document.getElementById('grupoMaxConfirmations').value = grupo.max_confirmations;
  document.getElementById('grupoPhone').value = grupo.phone || '';
  document.getElementById('grupoNotes').value = grupo.notes || '';

  applyGrupoModalMode('group');

  openModal('modalGrupo');
}

async function handleSaveGrupo(event) {
  event.preventDefault();

  const isIndividualMode = state.grupoModalMode === 'individual';
  const grupoName = document.getElementById('grupoName').value.trim();
  const grupoMaxConfirmations = isIndividualMode
    ? 1
    : parseInt(document.getElementById('grupoMaxConfirmations').value, 10);
  const grupoPhone = document.getElementById('grupoPhone').value.trim();
  const grupoNotes = document.getElementById('grupoNotes').value.trim();

  if (!grupoName || !grupoMaxConfirmations) {
    alert('Preencha os campos obrigatórios');
    return;
  }

  try {
    if (state.editingGrupoId) {
      // Editar
      const response = await fetchWithAuth(`/api/dashboard/guest-groups?id=${state.editingGrupoId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          groupName: grupoName,
          maxConfirmations: grupoMaxConfirmations,
          phone: grupoPhone,
          notes: grupoNotes,
        }),
      });

      if (!response.ok) throw new Error(response.statusText);
      alert('Grupo atualizado com sucesso!');
    } else {
      // Criar novo
      const response = await fetchWithAuth('/api/dashboard/guest-groups', {
        method: 'POST',
        body: JSON.stringify({
          eventId: state.eventId,
          groupName: grupoName,
          maxConfirmations: grupoMaxConfirmations,
          phone: grupoPhone,
          notes: grupoNotes,
        }),
      });

      if (!response.ok) throw new Error(response.statusText);
      const data = await response.json();
      alert(isIndividualMode
        ? `Convite individual criado! Link: ${data.data.inviteLink}`
        : `Grupo criado! Link: ${data.data.inviteLink}`);
    }

    closeModal('modalGrupo');
    state.editingGrupoId = null;
    await loadGrupos();
  } catch (error) {
    console.error('[handleSaveGrupo]', error);
    alert('Erro ao salvar grupo');
  }
}

async function deleteGrupo(grupoId) {
  if (!confirm('Tem certeza que deseja deletar este grupo? Isso não afetará as confirmações já registradas.')) {
    return;
  }

  try {
    const response = await fetchWithAuth(`/api/dashboard/guest-groups?id=${grupoId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error(response.statusText);
    alert('Grupo deletado com sucesso');
    await loadGrupos();
  } catch (error) {
    console.error('[deleteGrupo]', error);
    alert('Erro ao deletar grupo');
  }
}

// ============================================================
// CONFIRMAÇÕES
// ============================================================

async function reloadConfirmacoes() {
  const status = document.getElementById('filterStatus').value;
  const groupId = document.getElementById('filterGrupo').value;
  const searchTerm = document.getElementById('filterSearch')?.value.trim().toLowerCase() || '';

  await loadConfirmacoes(1, status, groupId, searchTerm);
  await populateGrupoFilter();
}

async function loadConfirmacoes(page = 1, status = '', groupId = '', searchTerm = '') {
  const container = document.getElementById('confirmacoesTable');
  const loading = document.getElementById('confirmacoesLoading');
  const empty = document.getElementById('confirmacoesEmpty');
  const body = document.getElementById('confirmacoesBody');

  loading.style.display = 'flex';
  container.hidden = true;
  empty.hidden = true;
  const paginacaoEl = document.getElementById('paginacao');
  if (paginacaoEl) paginacaoEl.innerHTML = '';

  try {
    let url = `/api/dashboard/confirmations?eventId=${state.eventId}&page=${page}`;
    if (status) url += `&status=${status}`;
    if (groupId) url += `&groupId=${groupId}`;

    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    const rawConfirmacoes = data.data || [];
    state.allConfirmacoes = rawConfirmacoes;
    state.confirmacoes = searchTerm
      ? rawConfirmacoes.filter((conf) => {
          const haystack = `${conf.name || ''} ${conf.phone || ''}`.toLowerCase();
          return haystack.includes(searchTerm);
        })
      : rawConfirmacoes;

    if (state.confirmacoes.length === 0) {
      empty.hidden = false;
      loading.style.display = 'none';
      renderPaginacao(searchTerm ? { totalPages: 1 } : data.pagination, page, status, groupId, searchTerm);
      updateOverview();
      return;
    }

    // Renderizar tabela
    body.innerHTML = state.confirmacoes.map(conf => `
      <tr>
        <td>
          <div class="cell-name">${escapeHtml(conf.name)}</div>
        </td>
        <td>${escapeHtml(conf.groupName)}</td>
        <td>
          ${renderStatusBadge(conf.status)}
        </td>
        <td>${new Date(conf.confirmedAt).toLocaleDateString('pt-BR')}</td>
      </tr>
    `).join('');

    // Paginação
    renderPaginacao(searchTerm ? { totalPages: 1 } : data.pagination, page, status, groupId, searchTerm);

    loading.style.display = 'none';
    container.hidden = false;
    updateOverview();
  } catch (error) {
    console.error('[loadConfirmacoes]', error);
    loading.innerHTML = '<p style="color: #c33;">Erro ao carregar confirmações</p>';
  }
}

function renderPaginacao(pagination, currentPage, status, groupId, searchTerm = '') {
  const paginacao = document.getElementById('paginacao');
  
  if (!pagination || pagination.totalPages <= 1 || searchTerm) {
    paginacao.innerHTML = '';
    return;
  }

  let html = '<div style="display: flex; gap: 0.5rem; justify-content: center; align-items: center;">';
  
  if (currentPage > 1) {
    html += `<button class="page-btn" onclick="loadConfirmacoes(${currentPage - 1}, '${status}', '${groupId}', '${escapeHtmlAttribute(searchTerm)}')">←</button>`;
  }

  html += `<span style="padding: 0.5rem 1rem; border: 1px solid var(--border); color: var(--text-dim);">
    Página ${currentPage} de ${pagination.totalPages}
  </span>`;

  if (currentPage < pagination.totalPages) {
    html += `<button class="page-btn" onclick="loadConfirmacoes(${currentPage + 1}, '${status}', '${groupId}', '${escapeHtmlAttribute(searchTerm)}')">→</button>`;
  }

  html += '</div>';
  paginacao.innerHTML = html;
}

async function populateGrupoFilter() {
  const select = document.getElementById('filterGrupo');
  select.innerHTML = '<option value="">Todos os grupos</option>';
  
  for (const grupo of state.grupos) {
    const option = document.createElement('option');
    option.value = grupo.id;
    option.textContent = grupo.group_name;
    select.appendChild(option);
  }
}

function clearFilters() {
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterGrupo').value = '';
  const filterSearch = document.getElementById('filterSearch');
  if (filterSearch) filterSearch.value = '';
  reloadConfirmacoes();
}

// ============================================================
// MENSAGENS E MUSICAS
// ============================================================

async function reloadMensagens() {
  const searchTerm = document.getElementById('filterMensagemSearch')?.value.trim() || '';
  await loadMensagens(1, searchTerm);
}

async function loadMensagens(page = 1, searchTerm = '') {
  const data = await loadSubmissions({
    type: 'message',
    page,
    searchTerm,
    tableId: 'mensagensTable',
    loadingId: 'mensagensLoading',
    emptyId: 'mensagensEmpty',
    bodyId: 'mensagensBody',
    paginationId: 'mensagensPaginacao',
  });

  if (!data) return;

  state.mensagens = data.data;
  const body = document.getElementById('mensagensBody');
  body.innerHTML = data.data.map((item) => {
    const name = escapeHtml(item.guestName || 'Anônimo');
    const message = escapeHtml(item.message || '—');
    const date = new Date(item.submittedAt).toLocaleDateString('pt-BR');
    return `
    <div class="msg-card">
      <span class="msg-quote">✦</span>
      <p class="msg-text">${message}</p>
      <div class="msg-meta">
        <span class="msg-author">${name}</span>
        <span class="msg-date">${date}</span>
      </div>
    </div>`;
  }).join('');

  renderSubmissionPagination(data.pagination, page, 'mensagensPaginacao', 'loadMensagens', searchTerm);
}

async function reloadMusicas() {
  const searchTerm = document.getElementById('filterMusicaSearch')?.value.trim() || '';
  await loadMusicas(1, searchTerm);
}

async function loadMusicas(page = 1, searchTerm = '') {
  const data = await loadSubmissions({
    type: 'song',
    page,
    searchTerm,
    tableId: 'musicasTable',
    loadingId: 'musicasLoading',
    emptyId: 'musicasEmpty',
    bodyId: 'musicasBody',
    paginationId: 'musicasPaginacao',
  });

  if (!data) return;

  state.musicas = data.data;
  const body = document.getElementById('musicasBody');
  body.innerHTML = data.data.map((item) => `
    <tr>
      <td><div class="cell-name">${escapeHtml(item.guestName || 'Anônimo')}</div></td>
      <td>${escapeHtml(item.songTitle || '—')}</td>
      <td>${escapeHtml(item.songArtist || '—')}</td>
      <td><span class="cell-sub">${escapeHtml(item.songNotes || '—')}</span></td>
      <td>${new Date(item.submittedAt).toLocaleDateString('pt-BR')}</td>
    </tr>
  `).join('');

  renderSubmissionPagination(data.pagination, page, 'musicasPaginacao', 'loadMusicas', searchTerm);
}

async function loadSubmissions({ type, page = 1, searchTerm = '', tableId, loadingId, emptyId, bodyId, paginationId }) {
  const container = document.getElementById(tableId);
  const loading = document.getElementById(loadingId);
  const empty = document.getElementById(emptyId);
  const body = document.getElementById(bodyId);
  const pagination = document.getElementById(paginationId);

  loading.style.display = 'flex';
  container.hidden = true;
  empty.hidden = true;
  body.innerHTML = '';
  if (pagination) pagination.innerHTML = '';

  try {
    let url = `/api/dashboard/submissions?eventId=${encodeURIComponent(state.eventId)}&type=${encodeURIComponent(type)}&page=${page}&pageSize=20`;
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }

    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    const rows = data.data || [];
    if (rows.length === 0) {
      empty.hidden = false;
      loading.style.display = 'none';
      return { data: [], pagination: data.pagination || { totalPages: 0 } };
    }

    loading.style.display = 'none';
    container.hidden = false;
    return { data: rows, pagination: data.pagination || { totalPages: 1 } };
  } catch (error) {
    console.error('[loadSubmissions]', error);
    loading.innerHTML = '<p style="color: #c33;">Erro ao carregar dados</p>';
    return null;
  }
}

function renderSubmissionPagination(pagination, currentPage, paginationId, callbackName, searchTerm = '') {
  const paginacao = document.getElementById(paginationId);
  if (!paginacao) return;

  if (!pagination || pagination.totalPages <= 1) {
    paginacao.innerHTML = '';
    return;
  }

  const safeSearch = escapeHtmlAttribute(searchTerm || '');
  let html = '<div style="display: flex; gap: 0.5rem; justify-content: center; align-items: center;">';

  if (currentPage > 1) {
    html += `<button class="page-btn" onclick="${callbackName}(${currentPage - 1}, '${safeSearch}')">←</button>`;
  }

  html += `<span style="padding: 0.5rem 1rem; border: 1px solid var(--border); color: var(--text-dim);">Página ${currentPage} de ${pagination.totalPages}</span>`;

  if (currentPage < pagination.totalPages) {
    html += `<button class="page-btn" onclick="${callbackName}(${currentPage + 1}, '${safeSearch}')">→</button>`;
  }

  html += '</div>';
  paginacao.innerHTML = html;
}

function clearMensagensFilters() {
  const filter = document.getElementById('filterMensagemSearch');
  if (filter) filter.value = '';
  reloadMensagens();
}

function clearMusicasFilters() {
  const filter = document.getElementById('filterMusicaSearch');
  if (filter) filter.value = '';
  reloadMusicas();
}

// ============================================================
// RELATÓRIOS
// ============================================================

async function loadRelatorios() {
  try {
    const response = await fetchWithAuth(`/api/dashboard/confirmations?eventId=${state.eventId}&pageSize=1000`);
    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    const confirmacoes = data.data || [];

    // Calcular estatísticas
    // Total = soma das vagas máximas dos grupos (não número de respostas)
    const total = state.grupos.reduce((sum, g) => sum + (Number(g.max_confirmations) || 0), 0);
    const confirmados = confirmacoes.filter(c => c.status === 'yes').length;
    const recusados = confirmacoes.filter(c => c.status === 'no').length;
    const pendentes = total - confirmados - recusados;
    // updateOverviewStats é responsabilidade exclusiva de updateOverview()

    // Breakdown por grupo
    const breakdown = {};
    state.grupos.forEach(grupo => {
      breakdown[grupo.id] = {
        groupName: grupo.group_name,
        total: 0,
        confirmados: 0,
        recusados: 0,
        pendentes: 0,
      };
    });

    confirmacoes.forEach(conf => {
      if (breakdown[conf.groupId]) {
        breakdown[conf.groupId].total++;
        if (conf.status === 'yes') {
          breakdown[conf.groupId].confirmados++;
        } else if (conf.status === 'no') {
          breakdown[conf.groupId].recusados++;
        } else {
          breakdown[conf.groupId].pendentes++;
        }
      }
    });

    // Renderizar breakdown
    const breakdownBody = document.getElementById('breakdownBody');
    breakdownBody.innerHTML = Object.values(breakdown).map(group => `
      <tr>
        <td><strong>${escapeHtml(group.groupName)}</strong></td>
        <td>${group.total}</td>
        <td>${group.confirmados}</td>
        <td>${group.recusados}</td>
        <td>${group.pendentes}</td>
        <td>${group.total > 0 ? Math.round((group.confirmados / group.total) * 100) : 0}%</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('[loadRelatorios]', error);
  }
}

// ============================================================
// EXPORT
// ============================================================

async function handleDownloadCsv() {
  try {
    let url = `/api/dashboard/confirmations/export?eventId=${state.eventId}`;
    
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(response.statusText);

    const csv = await response.text();

    // Criar blob e download
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8;' });
    const link = document.createElement('a');
    const url_obj = URL.createObjectURL(blob);
    link.setAttribute('href', url_obj);
    link.setAttribute('download', `confirmacoes-${state.eventId}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('[handleDownloadCsv]', error);
    alert('Erro ao baixar arquivo');
  }
}

// ============================================================
// LEMBRETES
// ============================================================

function sendLembrete(grupoId, grupoName) {
  document.getElementById('lembreteGrupo').textContent = grupoName;
  document.getElementById('lembreteTemplate').value = 'pending';
  updateMensagemPreview();
  openModal('modalLembrete');
  
  // Armazenar ID para uso na submissão
  document.getElementById('formLembrete').dataset.grupoId = grupoId;
}

function updateMensagemPreview() {
  const template = document.getElementById('lembreteTemplate').value;
  const coupleNames = window.__SITE_CONFIG__?.couple?.names || 'Casal';
  const templates = {
    pending: `Olá! Ainda não recebemos sua confirmação para o casamento de ${coupleNames}. Por favor, confirme sua presença através do link que recebeu.`,
    thankyou: `Obrigado por confirmar sua presença no casamento de ${coupleNames}! Fique atento para mais informações nos próximos dias.`,
    announcement: `Oi! Temos uma informação importante sobre o casamento de ${coupleNames}. Verifique seu email ou o convite online.`,
  };
  
  document.getElementById('lembreteMensagem').value = templates[template] || '';
}

async function handleSendLembrete(event) {
  event.preventDefault();

  const grupoId = event.target.dataset.grupoId;
  const message = document.getElementById('lembreteMensagem').value.trim();

  if (!message) {
    alert('Digite uma mensagem');
    return;
  }

  try {
    const response = await fetchWithAuth('/api/dashboard/reminders/send-whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        eventId: state.eventId,
        tokenId: grupoId,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(`Erro: ${data.error}`);
      return;
    }

    alert(`Lembrete enviado para ${data.data.phone}!`);
    closeModal('modalLembrete');
  } catch (error) {
    console.error('[handleSendLembrete]', error);
    alert('Erro ao enviar lembrete');
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function escapeHtmlAttribute(text) {
  return escapeHtml(String(text ?? '')).replace(/`/g, '&#096;');
}

function renderStatusBadge(status) {
  if (status === 'yes') {
    return '<span class="badge badge-ok">Confirmado</span>';
  }

  if (status === 'no') {
    return '<span class="badge badge-err">Recusado</span>';
  }

  return '<span class="badge badge-warn">Pendente</span>';
}

function updateOverview() {
  const totalConvidados = state.grupos.reduce((sum, grupo) => sum + (Number(grupo.max_confirmations) || 0), 0);
  const confirmados = state.allConfirmacoes.filter((conf) => conf.status === 'yes').length;
  const recusados = state.allConfirmacoes.filter((conf) => conf.status === 'no').length;
  const pendentes = Math.max(totalConvidados - confirmados - recusados, 0);

  updateOverviewStats(totalConvidados, confirmados, recusados, pendentes);

  const recentActivityBody = document.getElementById('recentActivityBody');
  if (!recentActivityBody) return;

  if (state.allConfirmacoes.length === 0) {
    recentActivityBody.innerHTML = '<tr><td colspan="4"><div class="empty"><div class="empty-title">Sem atividade recente</div><p class="empty-text">As confirmações mais recentes aparecerão aqui.</p></div></td></tr>';
    return;
  }

  recentActivityBody.innerHTML = state.allConfirmacoes.slice(0, 5).map((conf) => `
    <tr>
      <td>
        <div class="cell-name">${escapeHtml(conf.name)}</div>
      </td>
      <td>${escapeHtml(conf.groupName)}</td>
      <td>${renderStatusBadge(conf.status)}</td>
      <td>${new Date(conf.confirmedAt).toLocaleDateString('pt-BR')}</td>
    </tr>
  `).join('');
}

function updateOverviewStats(total, confirmados, recusados, pendentes) {
  const confirmadosPct = total > 0 ? Math.round((confirmados / total) * 100) : 0;
  const recusadosPct = total > 0 ? Math.round((recusados / total) * 100) : 0;
  const pendentesPct = total > 0 ? Math.round((pendentes / total) * 100) : 0;

  const statTotalConvidados = document.getElementById('statTotalConvidados');
  const statTotalConvidadosHint = document.getElementById('statTotalConvidadosHint');
  const statConfirmados = document.getElementById('statConfirmados');
  const statConfirmadosPct = document.getElementById('statConfirmadosPct');
  const statConfirmadosBar = document.getElementById('statConfirmadosBar');
  const statRecusados = document.getElementById('statRecusados');
  const statRecusadosPct = document.getElementById('statRecusadosPct');
  const statPendentes = document.getElementById('statPendentes');
  const statPendentesPct = document.getElementById('statPendentesPct');

  if (statTotalConvidados) statTotalConvidados.textContent = String(total);
  if (statTotalConvidadosHint) statTotalConvidadosHint.textContent = `${state.grupos.length} grupo(s) cadastrados`;
  if (statConfirmados) statConfirmados.textContent = String(confirmados);
  if (statConfirmadosPct) statConfirmadosPct.textContent = `${confirmadosPct}% do total previsto`;
  if (statConfirmadosBar) statConfirmadosBar.style.width = `${confirmadosPct}%`;
  if (statRecusados) statRecusados.textContent = String(recusados);
  if (statRecusadosPct) statRecusadosPct.textContent = `${recusadosPct}% do total previsto`;
  if (statPendentes) statPendentes.textContent = String(pendentes);
  if (statPendentesPct) statPendentesPct.textContent = `${pendentesPct}% do total previsto`;
}

// ============================================================
// WHATSAPP — CONVITE E CONTATO DIRETO
// ============================================================

function buildGuestInviteLink(token, explicitLink = '') {
  const normalizedExplicitLink = String(explicitLink || '').trim();
  if (normalizedExplicitLink) {
    return normalizedExplicitLink;
  }

  const encodedToken = encodeURIComponent(String(token || '').trim());
  if (state.eventSlug) {
    return `${window.location.origin}/${encodeURIComponent(state.eventSlug)}?g=${encodedToken}`;
  }

  return `${window.location.origin}/index.html?g=${encodedToken}`;
}

function syncPreviewInviteLink(slug) {
  syncDashboardEventSlug(slug);
}

function getInviteMessageBuilder() {
  return window.buildInviteWhatsAppMessage || ((options) => {
    const inviteLink = String(options?.link || '').trim();
    const inviteCoupleNames = String(options?.coupleNames || 'os noivos').trim() || 'os noivos';

    if (options?.isIndividual) {
      return (
        `Olá! Você foi convidado(a) para o casamento de ${inviteCoupleNames}! 🎊\n\n` +
        `Seu convite é exclusivo. Acesse o link abaixo para confirmar sua presença:\n\n` +
        `${inviteLink}\n\n` +
        `Aguardamos você com muito carinho! 🤍`
      );
    }

    return (
      `Olá! Você está sendo convidado(a) para o casamento de ${inviteCoupleNames}! 🎊\n\n` +
      `Seu convite é para ${options?.groupSizeLabel || 'vários convidados'}. Acesse o link abaixo para confirmar sua presença e compartilhe com os demais convidados do seu grupo:\n\n` +
      `${inviteLink}\n\n` +
      `Aguardamos você com muito carinho! 🤍`
    );
  });
}

function buildInviteMessageForGroup(grupo) {
  if (!grupo) return '';

  const coupleNames = window.__SITE_CONFIG__?.couple?.names || 'os noivos';
  const link = buildGuestInviteLink(grupo.token, grupo.inviteLink);
  const vagas = grupo.max_confirmations;
  const vagasTexto = vagas === 1 ? '1 pessoa' : `${vagas} pessoas`;
  const isIndividualInvite = Number(vagas) === 1;

  return getInviteMessageBuilder()({
    coupleNames,
    link,
    isIndividual: isIndividualInvite,
    groupSizeLabel: vagasTexto,
  });
}

async function copyTextToClipboard(text) {
  const value = String(text || '');
  if (!value) return;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const ta = document.createElement('textarea');
  ta.value = value;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function sendInviteWhatsApp(grupoId) {
  const grupo = state.grupos.find(g => g.id === grupoId);
  if (!grupo || !grupo.phone) return;

  const mensagem = buildInviteMessageForGroup(grupo);

  const digits = grupo.phone.replace(/\D/g, '');
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function copyInviteWhatsAppMessage(grupoId, triggerButton) {
  const grupo = state.grupos.find((g) => g.id === grupoId);
  if (!grupo) return;

  const mensagem = buildInviteMessageForGroup(grupo);
  if (!mensagem) return;

  try {
    await copyTextToClipboard(mensagem);
    showCopyFeedback('', triggerButton);
  } catch (error) {
    console.error('[copyInviteWhatsAppMessage]', error);
    alert('Não foi possível copiar o texto do convite.');
  }
}

// ============================================================
// COPIAR LINK DE CONVITE
// ============================================================

async function copyInviteLink(token) {
  const grupo = state.grupos.find((item) => item.token === token);
  const link = buildGuestInviteLink(token, grupo?.inviteLink);
  try {
    await navigator.clipboard.writeText(link);
    showCopyFeedback(token);
  } catch {
    // fallback legado para ambientes sem clipboard API
    const ta = document.createElement('textarea');
    ta.value = link;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyFeedback(token);
  }
}

function showCopyFeedback(token, triggerButton = null) {
  const btn = triggerButton || (token
    ? document.querySelector(`[data-copy-token="${CSS.escape(token)}"]`)
    : null);
  if (!btn) return;
  const original = btn.innerHTML;
  const originalBorder = btn.style.borderColor;
  const originalColor = btn.style.color;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  btn.style.borderColor = 'var(--success)';
  btn.style.color = 'var(--success)';
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.borderColor = originalBorder;
    btn.style.color = originalColor;
  }, 2000);
}

function openModal(modalId, title = null) {
  document.getElementById(modalId).classList.add('is-active');
  if (title && modalId === 'modalGrupo') {
    document.getElementById('modalGrupoTitle').textContent = title;
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('is-active');
  if (modalId === 'modalGrupo') {
    state.editingGrupoId = null;
    applyGrupoModalMode('group');
    document.getElementById('formGrupo').reset();
  }
}

function setupModalListeners() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

function buildAuthHeaders(token, incomingHeaders = {}) {
  const headers = {
    ...incomingHeaders,
    Authorization: `Bearer ${token}`,
  };

  return headers;
}

function withDefaultContentType(headers, body) {
  if (!(body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function refreshDashboardAccessToken() {
  const supabase = await getDashboardSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!sessionData?.session?.refresh_token) {
    return sessionStorage.getItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY) || null;
  }

  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    throw error;
  }

  const token = data?.session?.access_token || null;
  state.authToken = token;

  if (token) {
    sessionStorage.setItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY, token);
  }

  return token;
}

async function fetchWithAuth(url, options = {}) {
  let token = await getDashboardAccessToken();
  let headers = withDefaultContentType(buildAuthHeaders(token, options.headers), options.body);
  let response = await fetch(url, { ...options, headers });

  if (response.status !== 401) {
    return response;
  }

  token = await refreshDashboardAccessToken();
  if (!token) {
    return response;
  }

  headers = withDefaultContentType(buildAuthHeaders(token, options.headers), options.body);
  response = await fetch(url, { ...options, headers });
  return response;
}

// ============================================================
// CARREGAMENTO INICIAL
// ============================================================

async function loadAllData() {
  if (!state.eventId) {
    return;
  }

  // Grupos e confirmações em paralelo — reduz tempo total à metade
  await Promise.all([
    loadGrupos(),
    reloadConfirmacoes(),
  ]);
  // populateGrupoFilter depende de state.grupos — roda após o Promise.all
  populateGrupoFilter();
  // Relatórios em background — não bloqueiam o overview
  loadRelatorios();
}

// ============================================================
// EDITOR DE EVENTO
// ============================================================

const editorState = {
  isDirty: false,
  catalogItems: [],
  faqItems: [],
  originalConfig: null,
  galleryImages: [],
  selectedGalleryNames: [],
  draggingGalleryName: '',
};

const MEDIA_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MEDIA_BUCKET_ID = 'event-media';
const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const DEFAULT_FAQ_ITEMS = [
  {
    question: 'Tem estacionamento no local?',
    answer: 'Sim, contamos com estacionamento gratuito no local para todos os convidados.',
  },
  {
    question: 'Crianças até quantos anos contam como convidado?',
    answer: 'Crianças a partir de 7 anos contam como convidado. Menores que isso são bem-vindas sem ocupar vaga.',
  },
];

const PAGE_LABELS = {
  historia:   'Nossa História',
  faq:        'Perguntas Frequentes',
  hospedagem: 'Hospedagem',
  mensagem:   'Mensagem ao Casal',
  musica:     'Sugestão de Música',
  presente:   'Lista de Presentes',
};

const LAYOUT_THEMES = {
  classic: [
    { key: 'classic-gold',        label: 'Clássico Dourado' },
    { key: 'classic-gold-light',  label: 'Clássico Dourado Claro' },
    { key: 'classic-silver',      label: 'Clássico Prata' },
    { key: 'classic-silver-light',label: 'Clássico Prata Claro' },
    { key: 'classic-purple',      label: 'Clássico Roxo' },
    { key: 'classic-blue',        label: 'Clássico Azul' },
    { key: 'classic-green-light', label: 'Clássico Verde' },
  ],
  modern: [
    { key: 'black-silver', label: 'Moderno Preto & Prata' },
  ],
};

function resolveDashboardThemePath(activeTheme, layoutKey = 'classic') {
  const themeValue = String(activeTheme || '').trim();
  if (!themeValue) {
    return '';
  }

  if (themeValue.startsWith('assets/')) {
    return themeValue;
  }

  return `assets/layouts/${layoutKey}/themes/${themeValue}.json`;
}

function extractDashboardThemeKey(activeThemePath) {
  const themePath = String(activeThemePath || '').trim();
  if (!themePath) {
    return '';
  }

  const match = themePath.match(/\/themes\/([^/]+)\.json$/i);
  return match ? match[1] : themePath;
}

function syncDashboardEventSlug(slug) {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) {
    return;
  }

  state.eventSlug = normalizedSlug;

  const previewBtn = document.getElementById('btnPreviewInvite');
  if (previewBtn) {
    previewBtn.href = `${window.location.origin}/${encodeURIComponent(normalizedSlug)}`;
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('slug', normalizedSlug);
  const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
  history.replaceState(null, '', nextUrl);
}

function loadEditorTab() {
  if (!state.eventId) {
    setEditorStatusText('Evento não carregado — faça login novamente.');
    return;
  }

  const config = window.__SITE_CONFIG__;
  if (!config) {
    setEditorStatusText('Configuração não disponível — recarregue a página');
    return;
  }

  editorState.originalConfig = JSON.parse(JSON.stringify(config));
  editorState.isDirty = false;
  hideSectionFooters();
  setDefaultEditorSectionsOpenState();

  // Casal & Evento
  setVal('edCoupleNames',       config.couple?.names      ?? '');
  setVal('edCoupleSubtitle',    config.couple?.subtitle || window.__SITE_JSON__?.couple?.subtitle || 'Um momento pensado para viver ao lado de quem faz parte da nossa vida');
  setVal('edBrideName',         config.couple?.bride_name ?? config.couple?.brideName ?? '');
  setVal('edGroomName',         config.couple?.groom_name ?? config.couple?.groomName ?? '');
  // edEventDate é type="date" — precisa de YYYY-MM-DD (não ISO completo)
  const isoDate = config.event?.date ?? '';
  const datePart = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate;
  setVal('edEventDate', datePart);
  setVal('edEventTime',        config.event?.time        ?? '');
  // Popula campos derivados do config; se vazios, gera automaticamente da data
  const heroDate    = config.event?.heroDate    || '';
  const displayDate = config.event?.displayDate || '';
  const weekday     = config.event?.weekday     || '';
  if (heroDate || displayDate || weekday) {
    setVal('edEventHeroDate',    heroDate);
    setVal('edEventDisplayDate', displayDate);
    setVal('edEventWeekday',     weekday);
  } else if (datePart) {
    onEventDateChange();
  }
  setVal('edEventLocation',     config.event?.locationName  ?? '');
  setVal('edEventCity',         config.event?.locationCity  ?? '');
  setVal('edEventMapsLink',     config.event?.mapsLink      ?? '');
  setVal('edEventVenueAddress', config.event?.venueAddress  ?? '');
  setVal('edEventLat', config.event?.venueCoordinates?.lat ?? '');
  setVal('edEventLng', config.event?.venueCoordinates?.lng ?? '');
  setChk('edEventMapEnabled', !!config.event?.mapEnabled);

  // Tema
  const layout = config.activeLayout || 'classic';
  setVal('edActiveLayout', layout);
  populateThemeSelect(layout, config.activeTheme || '');

  // WhatsApp & RSVP
  setVal('edWaPhone',           config.whatsapp?.destinationPhone   ?? '');
  setVal('edWaRecipient',       config.whatsapp?.recipientName      ?? '');
  setVal('edWaMsgAttending',    config.whatsapp?.messages?.attending    ?? '');
  setVal('edWaMsgNotAttending', config.whatsapp?.messages?.notAttending ?? '');
  setChk('edRsvpSupabase', !!config.rsvp?.supabaseEnabled);

  // Presentes
  const gift = config.gift || {};
  const pixOn = gift.pixEnabled !== false && !!gift.pixKey;
  setChk('edGiftPixEnabled', pixOn);
  toggleGiftBlock('giftBlockPix', pixOn);
  setVal('edGiftPixKey', gift.pixKey    ?? '');
  setVal('edGiftPixQr',  gift.pixQrImage ?? '');
  renderPixQrPreview(gift.pixQrImage || '');
  bindMediaFileSelectionMeta();
  setPixQrUploadStatus('Selecione uma imagem para QR Pix (JPG, PNG ou WEBP até 10 MB).', false, {
    help: 'O sistema salva automaticamente após o envio.',
  });

  const cardOn = !!gift.cardPaymentEnabled;
  setChk('edGiftCardEnabled', cardOn);
  toggleGiftBlock('giftBlockCard', cardOn);
  setVal('edGiftCardLink', gift.cardPaymentLink ?? '');

  const cat = gift.catalog || {};
  const catOn = gift.catalogEnabled !== false && (Array.isArray(cat.items) ? cat.items.length > 0 : false);
  setChk('edGiftCatalogEnabled', catOn || !!gift.catalogEnabled);
  toggleGiftBlock('giftBlockCatalog', catOn || !!gift.catalogEnabled);
  setVal('edGiftCatalogTitle',    cat.title    ?? '');
  setVal('edGiftCatalogSubtitle', cat.subtitle ?? '');
  editorState.catalogItems = Array.isArray(cat.items)
    ? cat.items.map(it => ({ ...it }))
    : [];
  // Restaura o radio do tipo de catálogo
  const activeCatalogKey = cat.key || gift.activeCatalogKey || 'honeymoon';
  window.__catalogType = activeCatalogKey;
  document.querySelectorAll('input[name="catalogType"]').forEach(r => {
    r.checked = (r.value === activeCatalogKey);
  });
  syncCatalogMetaFields(activeCatalogKey);
  renderCatalogItems();

  // Presentes — lista externa
  const ext = gift.external || {};
  const extEnabled = !!ext.enabled;
  setChk('edExternalEnabled', extEnabled);
  toggleGiftBlock('giftBlockExternal', extEnabled);
  setVal('edExternalStore', ext.store ?? '');
  setVal('edExternalUrl',   ext.url   ?? '');
  setVal('edExternalLabel', ext.label ?? '');

  // Fotos & Mídia — Áudio
  setVal('edMediaHero',       config.media?.heroImage             ?? '');
  const _mainTrack = config.media?.tracks?.main ?? {};
  setChk('edTrackEnabled', _mainTrack.enabled !== false);
  const _vol = Math.round((_mainTrack.volume ?? 0.14) * 100);
  setVal('edTrackVolume', _vol);
  _syncVolumeSlider(document.getElementById('edTrackVolume'));
  setVal('edTrackStart',  _mainTrack.startTime ?? '');
  fetchSongsList(_mainTrack.src ?? '');
  renderMediaHeroPreview(config.media?.heroImage || '');
  setEditorGalleryImages(config.pages?.historia?.content?.gallery || []);
  refreshGalleryFromApi(true);
  setHeroUploadStatus('Selecione uma foto (JPG, PNG ou WEBP até 10 MB).', false, {
    help: 'O sistema salva automaticamente após o envio.',
  });
  setMediaUploadStatus('Selecione imagens da galeria (JPG, PNG ou WEBP até 10 MB).', false, {
    help: 'O sistema salva automaticamente após o envio.',
  });

  // Páginas extras
  renderPagesGrid(config.pages || {});

  // Capítulos de Nossa História
  const _chapters = config.pages?.historia?.content?.chapters || [];
  for (let _i = 0; _i < 3; _i++) {
    const _ch = _chapters[_i] || {};
    setVal(`edChapter${_i}Year`,  _ch.year  ?? '');
    setVal(`edChapter${_i}Title`, _ch.title ?? '');
    setVal(`edChapter${_i}Text`,  _ch.text  ?? '');
  }

  // FAQ
  const _savedFaq = config.pages?.faq?.content?.items;
  editorState.faqItems = (Array.isArray(_savedFaq) && _savedFaq.length > 0)
    ? _savedFaq.map(it => ({ question: it.question || '', answer: it.answer || '' }))
    : DEFAULT_FAQ_ITEMS.map(it => ({ ...it }));
  renderFaqItems();

  updateEditorSaveStatus();
}

// ── Helpers de formulário ─────────────────────────────────────

// ── Extração automática de coordenadas do link do Google Maps ──────────────

function extractCoordsFromMapsLink(url) {
  if (!url) return null;
  // Formato: /place/.../@lat,lng,zoom
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  // Formato: ?q=lat,lng ou ?ll=lat,lng ou &ll=lat,lng
  const qMatch = url.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  return null;
}

function onMapsLinkExtract() {
  const input   = document.getElementById('edEventMapsLink');
  const statusEl = document.getElementById('edEventCoordsStatus');
  const latEl   = document.getElementById('edEventLat');
  const lngEl   = document.getElementById('edEventLng');
  if (!input || !statusEl) return;

  const url = input.value.trim();
  statusEl.style.display = 'block';

  // Link encurtado (maps.app.goo.gl) — não é possível extrair sem fetch
  if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
    statusEl.textContent = '⚠ Link encurtado detectado — cole o link completo do Maps para extrair as coordenadas automaticamente.';
    statusEl.style.color = 'var(--text-soft, #aaa)';
    return;
  }

  if (!url) {
    statusEl.style.display = 'none';
    return;
  }

  const coords = extractCoordsFromMapsLink(url);
  if (coords) {
    if (latEl) { latEl.value = coords.lat; }
    if (lngEl) { lngEl.value = coords.lng; }
    statusEl.textContent = `✓ Coordenadas extraídas: ${coords.lat}, ${coords.lng}`;
    statusEl.style.color = 'var(--primary, #c9a84c)';
    markEditorDirty();
  } else {
    statusEl.textContent = 'Coordenadas não encontradas — verifique se o link é do Google Maps completo.';
    statusEl.style.color = 'var(--text-soft, #aaa)';
  }
}

// ── Geração automática dos formatos de data ──────────────────────────────────

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL  = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const WEEKDAYS     = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function generateDateFormats(isoDate) {
  // T12:00:00 evita problemas de fuso horário (date-only strings são tratadas como UTC)
  const date = new Date(isoDate + 'T12:00:00');
  if (isNaN(date.getTime())) return null;

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();

  return {
    heroDate:    `${d} . ${m} . ${y}`,
    detailDate:  `${d} ${MONTHS_SHORT[date.getMonth()]} ${y}`,
    displayDate: `${d} de ${MONTHS_FULL[date.getMonth()]} de ${y}`,
    weekday:     WEEKDAYS[date.getDay()],
  };
}

function onEventDateChange() {
  const dateInput = document.getElementById('edEventDate');
  if (!dateInput?.value) return;

  const formats = generateDateFormats(dateInput.value);
  if (!formats) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('edEventHeroDate',    formats.heroDate);
  set('edEventDisplayDate', formats.displayDate);
  set('edEventWeekday',     formats.weekday);
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setChk(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = checked;
}

// ── Section footer helpers ───────────────────────────────────
const SECTION_FOOTER_IDS = [
  'edSectionEvento', 'edSectionTema', 'edSectionWhatsApp', 'edSectionPresentes',
  'edSectionMidia', 'edSectionHistoria', 'edSectionFaq', 'edSectionPages',
];

const EDITOR_SECTION_IDS = [
  'edSectionEvento',
  'edSectionTema',
  'edSectionWhatsApp',
  'edSectionPresentes',
  'edSectionMidia',
  'edSectionHistoria',
  'edSectionFaq',
  'edSectionPages',
];

function setDefaultEditorSectionsOpenState() {
  EDITOR_SECTION_IDS.forEach((id) => {
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.toggle('is-open', id === 'edSectionEvento');
  });
}

function showSectionFootersDirty() {
  SECTION_FOOTER_IDS.forEach(id => {
    const footer = document.getElementById('footer-' + id);
    if (!footer) return;
    footer.classList.remove('is-saved');
    footer.classList.add('is-dirty');
  });
}

function showSectionFootersSaved() {
  SECTION_FOOTER_IDS.forEach(id => {
    const footer = document.getElementById('footer-' + id);
    if (!footer) return;
    footer.classList.remove('is-dirty');
    footer.classList.add('is-saved');
  });
  setTimeout(hideSectionFooters, 2500);
}

function hideSectionFooters() {
  SECTION_FOOTER_IDS.forEach(id => {
    const footer = document.getElementById('footer-' + id);
    if (!footer) return;
    footer.classList.remove('is-dirty', 'is-saved');
  });
}
// ─────────────────────────────────────────────────────────────

function markEditorDirty() {
  showSectionFootersDirty();
  if (editorState.isDirty) return;
  editorState.isDirty = true;
  updateEditorSaveStatus();
}

function updateEditorSaveStatus(message) {
  const statusEl = document.getElementById('editorSaveStatus');
  const textEl   = document.getElementById('editorSaveStatusText');
  if (!statusEl || !textEl) return;

  if (message) {
    textEl.textContent = message;
    statusEl.className = 'editor-save-status is-saved';
    return;
  }

  if (editorState.isDirty) {
    textEl.textContent = 'Alterações não salvas';
    statusEl.className = 'editor-save-status is-dirty';
  } else {
    textEl.textContent = 'Configurações carregadas';
    statusEl.className = 'editor-save-status';
  }
}

function setEditorStatusText(msg) {
  const el = document.getElementById('editorSaveStatusText');
  if (el) el.textContent = msg;
}

function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getUploadStatusVariant(isError = false, forceVariant = '') {
  if (forceVariant) return forceVariant;
  return isError ? 'error' : 'idle';
}

function setUploadStatus(containerId, message, isError = false, options = {}) {
  const statusEl = document.getElementById(containerId);
  if (!statusEl) return;

  const textEl = statusEl.querySelector('.upload-status-text');
  const percentEl = statusEl.querySelector('.upload-status-percent');
  const helpEl = statusEl.querySelector('.upload-status-help');
  const progressWrapEl = statusEl.querySelector('.upload-progress');
  const progressBarEl = statusEl.querySelector('.upload-progress-bar');

  if (!textEl || !percentEl || !helpEl || !progressWrapEl || !progressBarEl) {
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--text-dim)';
    return;
  }

  const {
    progress = null,
    help = '',
    variant = '',
  } = options;

  const statusVariant = getUploadStatusVariant(isError, variant);

  statusEl.hidden = !message && !help;
  statusEl.classList.remove('is-loading', 'is-success', 'is-warning', 'is-error');
  if (statusVariant && statusVariant !== 'idle') {
    statusEl.classList.add(`is-${statusVariant}`);
  }

  textEl.textContent = message || '';
  helpEl.textContent = help || '';

  const hasProgress = Number.isFinite(progress);
  if (hasProgress) {
    const safeProgress = Math.min(100, Math.max(0, Math.round(progress)));
    progressWrapEl.hidden = false;
    progressBarEl.style.width = `${safeProgress}%`;
    percentEl.textContent = `${safeProgress}%`;
  } else {
    progressWrapEl.hidden = true;
    progressBarEl.style.width = '0%';
    percentEl.textContent = '';
  }
}

function setMediaUploadStatus(message, isError = false, options = {}) {
  setUploadStatus('edMediaUploadStatus', message, isError, options);
}

function setHeroUploadStatus(message, isError = false, options = {}) {
  setUploadStatus('edMediaHeroUploadStatus', message, isError, options);
}

function setPixQrUploadStatus(message, isError = false, options = {}) {
  setUploadStatus('edGiftPixQrUploadStatus', message, isError, options);
}

function isValidMediaFile(file) {
  if (!file) return false;
  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.type || '')) return false;
  if (Number(file.size || 0) <= 0) return false;
  return Number(file.size || 0) <= MEDIA_MAX_FILE_SIZE_BYTES;
}

function validateMediaFile(file) {
  if (!file) {
    return 'Arquivo não encontrado.';
  }
  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.type || '')) {
    return 'Formato inválido. Use JPG, PNG ou WEBP.';
  }
  if (Number(file.size || 0) > MEDIA_MAX_FILE_SIZE_BYTES) {
    return 'Arquivo excede 10 MB. Escolha um arquivo menor.';
  }
  return '';
}

function appendCacheBustParam(url) {
  const source = String(url || '').trim();
  if (!source) return '';

  try {
    const parsed = new URL(source, window.location.origin);
    parsed.searchParams.set('v', Date.now().toString());
    return parsed.toString();
  } catch {
    const separator = source.includes('?') ? '&' : '?';
    return `${source}${separator}v=${Date.now()}`;
  }
}

function isHeroMediaUrl(url) {
  const source = String(url || '').trim();
  if (!source) return false;

  try {
    const parsed = new URL(source, window.location.origin);
    return /\/hero\/hero\./i.test(parsed.pathname);
  } catch {
    return /\/hero\/hero\./i.test(source);
  }
}

function normalizeUploadErrorMessage(error) {
  const raw = String(error?.message || '').trim();
  if (!raw) return 'Não foi possível concluir o upload. Tente novamente.';

  if (/unsupported file type/i.test(raw)) {
    return 'Formato inválido. Envie JPG, PNG ou WEBP.';
  }
  if (/limite de 10\s*mb|excede.*10\s*mb|maxfilesize|file size/i.test(raw)) {
    return 'Arquivo muito grande. O limite é 10 MB por arquivo.';
  }
  if (/413|payload too large|request entity too large/i.test(raw) || Number(error?.status) === 413) {
    return 'O servidor recusou o upload por limite de payload da infraestrutura. Tente novamente; se persistir, verifique as políticas de upload direto no bucket.';
  }
  if (/expired|sess[aã]o|unauthorized|401|forbidden|403/i.test(raw)) {
    return 'Sua sessão expirou. Faça login novamente e tente o envio.';
  }
  if (/network|failed to fetch/i.test(raw)) {
    return 'Falha de rede no envio. Verifique sua conexão e tente novamente.';
  }
  if (/internal server error|500/i.test(raw)) {
    return 'Erro interno no servidor ao enviar mídia. Tente novamente.';
  }
  return raw;
}

function setFileMetaText(elementId, text = '') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
}

function bindInputChangeOnce(inputId, handler) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.boundChange === 'true') return;
  input.addEventListener('change', handler);
  input.dataset.boundChange = 'true';
}

function bindMediaFileSelectionMeta() {
  bindInputChangeOnce('edGiftPixQrFile', (event) => {
    const file = event.target?.files?.[0];
    if (!file) {
      setFileMetaText('edGiftPixQrFileMeta', '');
      return;
    }
    setFileMetaText('edGiftPixQrFileMeta', `${file.name} (${formatFileSize(file.size)})`);
  });

  bindInputChangeOnce('edMediaHeroFile', (event) => {
    const file = event.target?.files?.[0];
    if (!file) {
      setFileMetaText('edMediaHeroFileMeta', '');
      return;
    }
    setFileMetaText('edMediaHeroFileMeta', `${file.name} (${formatFileSize(file.size)})`);
  });

  bindInputChangeOnce('edMediaGalleryFiles', (event) => {
    const files = Array.from(event.target?.files || []);
    if (!files.length) {
      setFileMetaText('edMediaGalleryFileMeta', '');
      return;
    }
    const totalBytes = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
    setFileMetaText('edMediaGalleryFileMeta', `${files.length} arquivo(s) selecionado(s) • ${formatFileSize(totalBytes)}`);
  });
}

async function uploadMediaFile(type, file, options = {}) {
  if (type === 'hero') {
    return uploadMediaFileViaApi(type, file, options);
  }

  try {
    return await uploadMediaFileDirect(type, file, options);
  } catch (directUploadError) {
    // Fallback de compatibilidade para projetos sem policy de upload direto no bucket.
    return uploadMediaFileViaApi(type, file, options, directUploadError);
  }
}

function sanitizeUploadFileBaseName(fileName) {
  const source = String(fileName || 'upload')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');

  return source || 'upload';
}

function resolveUploadFileExtension(file) {
  const typeToExtension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  const mimeType = String(file?.type || '').toLowerCase();
  if (typeToExtension[mimeType]) {
    return typeToExtension[mimeType];
  }

  const originalName = String(file?.name || '');
  if (originalName.includes('.')) {
    return originalName.split('.').pop().toLowerCase();
  }

  return 'bin';
}

function getEventStorageRoot() {
  // The API always prefers slug over ID as storage root.
  // Direct uploads must use the same root to keep paths consistent.
  return String(state.eventSlug || state.eventId || '').trim();
}

function buildMediaStoragePath(type, file) {
  const storageRoot = getEventStorageRoot();
  if (!storageRoot) {
    throw new Error('Evento não carregado no dashboard. Recarregue a página.');
  }

  const extension = resolveUploadFileExtension(file);

  if (type === 'hero') {
    return `${storageRoot}/hero/hero.${extension}`;
  }

  if (type === 'pix-qr') {
    return `${storageRoot}/pix/pix-qr.${extension}`;
  }

  const safeBaseName = sanitizeUploadFileBaseName(file?.name || 'upload');
  return `${storageRoot}/gallery/${Date.now()}-${safeBaseName}.${extension}`;
}

async function removeOtherMediaFilesInFolder(storage, folderPrefix, keepName) {
  try {
    const { data, error } = await storage.list(folderPrefix, { limit: 100 });
    if (error || !Array.isArray(data) || data.length === 0) {
      return;
    }

    const pathsToRemove = data
      .filter((entry) => Boolean(entry?.name) && entry.name !== keepName)
      .map((entry) => `${folderPrefix}/${entry.name}`);

    if (pathsToRemove.length > 0) {
      await storage.remove(pathsToRemove);
    }
  } catch {
    // Limpeza não é bloqueante.
  }
}

async function uploadMediaFileDirect(type, file, options = {}) {
  const { onProgress } = options;

  if (!state.eventId) {
    throw new Error('Evento não carregado no dashboard. Recarregue a página.');
  }

  const supabase = await getDashboardSupabaseClient();
  const { data: freshSession } = await supabase.auth.getSession();
  const freshToken = freshSession?.session?.access_token || null;
  if (freshToken) {
    state.authToken = freshToken;
    sessionStorage.setItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY, freshToken);
  }

  if (!state.authToken) {
    throw new Error('Sessão expirada. Faça login novamente no dashboard.');
  }

  if (typeof onProgress === 'function') {
    onProgress(5);
  }

  const storagePath = buildMediaStoragePath(type, file);
  const storage = supabase.storage.from(MEDIA_BUCKET_ID);

  const { error: uploadError } = await storage.upload(storagePath, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: type === 'hero' || type === 'pix-qr',
  });

  if (uploadError) {
    throw uploadError;
  }

  if (typeof onProgress === 'function') {
    onProgress(95);
  }

  if (type === 'hero' || type === 'pix-qr') {
    const storageRoot = getEventStorageRoot();
    const folderPrefix = type === 'hero'
      ? `${storageRoot}/hero`
      : `${storageRoot}/pix`;
    const newFileName = storagePath.replace(`${folderPrefix}/`, '');
    await removeOtherMediaFilesInFolder(storage, folderPrefix, newFileName);
  }

  const { data } = storage.getPublicUrl(storagePath);

  if (typeof onProgress === 'function') {
    onProgress(100);
  }

  return {
    eventId: state.eventId,
    path: storagePath,
    type,
    url: data?.publicUrl || '',
  };
}

function uploadMediaFileViaApi(type, file, options = {}, directUploadError = null) {
  const { onProgress } = options;

  const formData = new FormData();
  formData.append('eventId', state.eventId);
  formData.append('type', type);
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/dashboard/media');
    request.setRequestHeader('Authorization', `Bearer ${state.authToken}`);

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress);
    });

    request.addEventListener('error', () => {
      reject(new Error('Falha de rede no envio de mídia.'));
    });

    request.addEventListener('load', () => {
      let payload = {};
      try {
        payload = JSON.parse(request.responseText || '{}');
      } catch {
        payload = {};
      }

      if (request.status >= 200 && request.status < 300) {
        resolve(payload);
        return;
      }

      const fallbackError = new Error(payload.error || `Falha ao enviar mídia (${request.status})`);
      fallbackError.status = request.status;
      if (directUploadError) {
        fallbackError.cause = directUploadError;
      }
      reject(fallbackError);
    });

    request.send(formData);
  });
}

function renderMediaHeroPreview(url) {
  const previewWrap = document.getElementById('edMediaHeroPreviewWrap');
  const previewImg = document.getElementById('edMediaHeroPreview');
  const previewUrl = document.getElementById('edMediaHeroPreviewUrl');
  const emptyEl = document.getElementById('edMediaHeroEmpty');

  if (!previewWrap || !previewImg || !emptyEl) {
    return;
  }

  const source = String(url || document.getElementById('edMediaHero')?.value || '').trim();

  if (source) {
    let resolvedSource = source;

    try {
      resolvedSource = new URL(source, window.location.href).href;
    } catch (error) {
      resolvedSource = source;
    }

    previewImg.src = resolvedSource;
    if (previewUrl) {
      previewUrl.textContent = '';
    }
    previewWrap.style.display = '';
    emptyEl.style.display = 'none';
    return;
  }

  previewImg.removeAttribute('src');
  if (previewUrl) {
    previewUrl.textContent = '';
  }
  previewWrap.style.display = 'none';
  emptyEl.style.display = '';
}

function renderPixQrPreview(url) {
  const previewWrap = document.getElementById('edGiftPixQrPreviewWrap');
  const previewImg = document.getElementById('edGiftPixQrPreview');
  const previewUrl = document.getElementById('edGiftPixQrPreviewUrl');
  const emptyEl = document.getElementById('edGiftPixQrEmpty');

  if (!previewWrap || !previewImg || !emptyEl) {
    return;
  }

  const source = String(url || document.getElementById('edGiftPixQr')?.value || '').trim();

  if (source) {
    let resolvedSource = source;

    try {
      resolvedSource = new URL(source, window.location.href).href;
    } catch (error) {
      resolvedSource = source;
    }

    previewImg.src = resolvedSource;
    if (previewUrl) {
      previewUrl.textContent = '';
    }
    previewWrap.style.display = '';
    emptyEl.style.display = 'none';
    return;
  }

  previewImg.removeAttribute('src');
  if (previewUrl) {
    previewUrl.textContent = '';
  }
  previewWrap.style.display = 'none';
  emptyEl.style.display = '';
}

function extractGalleryNameFromSource(source) {
  const input = String(source || '').trim();
  if (!input) return '';

  const match = input.match(/\/gallery\/([^/?#]+)$/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return '';
}

function normalizeGalleryImageItem(image, index) {
  // API response uses `url`; config JSON uses `src` — accept both
  const src = String(image?.src || image?.url || '').trim();
  const path = String(image?.path || '').trim();
  const name = String(image?.name || extractGalleryNameFromSource(path || src)).trim();
  const alt = String(image?.alt || `Foto ${index + 1}`).trim() || `Foto ${index + 1}`;

  return {
    src,
    path,
    name,
    alt,
    key: name || src || `gallery-${index + 1}`,
  };
}

function syncGalleryToSiteConfig() {
  if (!window.__SITE_CONFIG__) return;
  const gallery = ensureHistoriaGalleryArray(window.__SITE_CONFIG__);
  gallery.length = 0;
  editorState.galleryImages.forEach((image) => {
    gallery.push({ src: image.src || '', alt: image.alt || '' });
  });
}

function updateMediaGalleryToolbar() {
  const toolbar = document.getElementById('edMediaGalleryToolbar');
  const info = document.getElementById('edMediaGallerySelectionInfo');
  const deleteBtn = document.getElementById('btnGalleryDeleteSelected');
  const selectAllBtn = document.getElementById('btnGallerySelectAll');
  const total = editorState.galleryImages.length;
  const selected = editorState.selectedGalleryNames.length;

  if (toolbar) {
    toolbar.hidden = total === 0;
  }

  if (info) {
    const selectedLabel = selected === 1 ? '1 foto selecionada' : `${selected} fotos selecionadas`;
    const totalLabel = total === 1 ? '1 foto' : `${total} fotos`;
    info.textContent = `${selectedLabel} de ${totalLabel}`;
  }

  if (deleteBtn) {
    deleteBtn.disabled = selected === 0;
  }

  if (selectAllBtn) {
    const allSelected = total > 0 && selected === total;
    const span = selectAllBtn.querySelector('span');
    if (span) {
      span.textContent = allSelected ? 'Desmarcar todas' : 'Selecionar todas';
    }
  }
}

function setEditorGalleryImages(images, options = {}) {
  const { preserveSelection = false } = options;
  const nextImages = (Array.isArray(images) ? images : [])
    .map((image, index) => normalizeGalleryImageItem(image, index))
    .filter((image) => Boolean(image.src));

  const previousSelection = preserveSelection ? new Set(editorState.selectedGalleryNames) : new Set();

  editorState.galleryImages = nextImages;
  editorState.selectedGalleryNames = nextImages
    .map((image) => image.name)
    .filter((name) => name && previousSelection.has(name));

  syncGalleryToSiteConfig();
  renderMediaGalleryGrid(nextImages);
}

function toggleGalleryImageSelectionByIndex(index, checked) {
  const item = editorState.galleryImages[index];
  if (!item?.name) return;

  if (checked) {
    if (!editorState.selectedGalleryNames.includes(item.name)) {
      editorState.selectedGalleryNames.push(item.name);
    }
  } else {
    editorState.selectedGalleryNames = editorState.selectedGalleryNames.filter((name) => name !== item.name);
  }

  renderMediaGalleryGrid(editorState.galleryImages);
}

function toggleSelectAllGalleryImages() {
  const total = editorState.galleryImages.length;
  if (!total) return;

  if (editorState.selectedGalleryNames.length === total) {
    editorState.selectedGalleryNames = [];
  } else {
    editorState.selectedGalleryNames = editorState.galleryImages
      .map((image) => image.name)
      .filter(Boolean);
  }

  renderMediaGalleryGrid(editorState.galleryImages);
}

async function requestGalleryList() {
  const response = await fetchWithAuth(`/api/dashboard/media?type=gallery&eventId=${encodeURIComponent(state.eventId)}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível carregar a galeria.');
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

async function refreshGalleryFromApi(silent = false) {
  if (!state.eventId) return;

  try {
    const items = await requestGalleryList();
    setEditorGalleryImages(items, { preserveSelection: true });
  } catch (error) {
    if (!silent) {
      setMediaUploadStatus(normalizeUploadErrorMessage(error), true, {
        variant: 'error',
        help: 'Não foi possível atualizar a galeria do Storage.',
      });
    }
  }
}

async function fetchSongsList(currentSrc = '') {
  const sel = document.getElementById('edTrackSrc');
  const hint = document.getElementById('edTrackSrcHint');
  if (!sel) return;

  try {
    const response = await fetchWithAuth(`/api/dashboard/media?type=songs&eventId=${encodeURIComponent(state.eventId)}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      sel.innerHTML = '<option value="">— Erro ao carregar músicas —</option>';
      if (hint) hint.textContent = payload.error || 'Não foi possível carregar as músicas do Storage.';
      return;
    }

    const files = Array.isArray(payload.files) ? payload.files : [];

    if (files.length === 0) {
      sel.innerHTML = '<option value="">— Nenhuma música na pasta songs/ —</option>';
      if (hint) hint.textContent = 'Carregue arquivos de áudio (.mp3) na pasta songs/ do bucket event-media no Supabase.';
      return;
    }

    const selectedValue = currentSrc || sel.value;
    const options = files.map((f) => {
      const label = f.name.replace(/\.(mp3|m4a|ogg|wav|aac)$/i, '').replace(/[-_]+/g, ' ');
      const selected = f.url === selectedValue ? ' selected' : '';
      return `<option value="${f.url}"${selected}>${label}</option>`;
    });

    // Preserve a custom src that isn't in the list
    if (selectedValue && !files.some((f) => f.url === selectedValue)) {
      const label = selectedValue.split('/').pop() || selectedValue;
      options.unshift(`<option value="${selectedValue}" selected>${label} (personalizado)</option>`);
    }

    sel.innerHTML = options.join('');
    if (hint) hint.textContent = `${files.length} música${files.length !== 1 ? 's' : ''} disponível${files.length !== 1 ? 'eis' : ''}.`;
  } catch (err) {
    sel.innerHTML = '<option value="">— Erro ao carregar músicas —</option>';
    if (hint) hint.textContent = 'Não foi possível carregar as músicas do Storage.';
    console.error('[dashboard] fetchSongsList error', err);
  }
}

// ── Preview de música no editor ──────────────────────────────────────────────

let _previewAudio = null;

function _syncVolumeSlider(el) {
  if (!el) return;
  const pct = el.value + '%';
  el.style.setProperty('--vol-pct', pct);
  const display = document.getElementById('edTrackVolumeDisplay');
  if (display) display.textContent = pct;
}

function _updatePreviewStatus(text, isError = false) {
  const el = document.getElementById('edPreviewStatus');
  if (el) {
    el.textContent = text;
    el.style.color = isError ? '#e74c3c' : '';
  }
}

function audioPreviewPlay() {
  const src    = document.getElementById('edTrackSrc')?.value;
  const volume = (parseFloat(document.getElementById('edTrackVolume')?.value) || 14) / 100;
  const start  = parseInt(document.getElementById('edTrackStart')?.value)    || 0;

  if (!src) {
    _updatePreviewStatus('Selecione uma música primeiro.', true);
    return;
  }

  const isNewSrc = !_previewAudio || _previewAudio.src !== src;
  if (isNewSrc) {
    if (_previewAudio) _previewAudio.pause();
    _previewAudio = new Audio(src);
    _previewAudio.loop = true;
    _previewAudio.onerror = () => _updatePreviewStatus('Erro ao carregar áudio.', true);
  }

  _previewAudio.volume = volume;
  _updatePreviewStatus('Carregando…');

  const doPlay = () => {
    try { _previewAudio.currentTime = start; } catch {}
    _previewAudio.play()
      .then(() => _updatePreviewStatus('▶ Tocando'))
      .catch(() => _updatePreviewStatus('Erro ao reproduzir.', true));
  };

  if (_previewAudio.readyState >= 1) {
    doPlay();
  } else {
    _previewAudio.addEventListener('loadedmetadata', doPlay, { once: true });
    _previewAudio.load();
  }
}

function audioPreviewPause() {
  if (!_previewAudio || _previewAudio.paused) {
    _updatePreviewStatus('Nada tocando.');
    return;
  }
  _previewAudio.pause();
  _updatePreviewStatus('⏸ Pausado');
}

function audioPreviewStop() {
  if (!_previewAudio) return;
  _previewAudio.pause();
  const start = parseInt(document.getElementById('edTrackStart')?.value) || 0;
  try { _previewAudio.currentTime = start; } catch {}
  _updatePreviewStatus('⏹ Parado');
}

async function requestGalleryReorder(orderNames) {
  const response = await fetchWithAuth('/api/dashboard/media', {
    method: 'PATCH',
    body: JSON.stringify({
      eventId: state.eventId,
      type: 'gallery',
      order: orderNames,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível salvar a ordem da galeria.');
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

async function persistGalleryOrder() {
  const orderNames = editorState.galleryImages.map((image) => image.name).filter(Boolean);
  if (!orderNames.length) return;

  setMediaUploadStatus('Salvando nova ordem da galeria...', false, {
    variant: 'loading',
    progress: 100,
    help: 'Aguarde a confirmação.',
  });

  await requestGalleryReorder(orderNames);
  setMediaUploadStatus('Ordem da galeria atualizada com sucesso.', false, {
    variant: 'success',
    progress: 100,
    help: 'Pronto. A ordem já está salva.',
  });
}

function schedulePersistGalleryOrder() {
  clearTimeout(galleryOrderSaveTimer);
  setMediaUploadStatus('Aguardando para salvar...', false, {
    variant: 'loading',
    progress: 50,
    help: 'A ordem será salva automaticamente.',
  });
  galleryOrderSaveTimer = setTimeout(async () => {
    try {
      await persistGalleryOrder();
    } catch (error) {
      setMediaUploadStatus(normalizeUploadErrorMessage(error), true, {
        variant: 'error',
        help: 'Não foi possível salvar a nova ordem. Tente novamente.',
      });
      await refreshGalleryFromApi(true);
    }
  }, 2000);
}

function moveGalleryImageByOffset(index, delta) {
  const targetIndex = index + delta;
  if (index < 0 || targetIndex < 0 || targetIndex >= editorState.galleryImages.length) {
    return;
  }

  const reordered = [...editorState.galleryImages];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);
  editorState.galleryImages = reordered;
  syncGalleryToSiteConfig();
  renderMediaGalleryGrid(reordered);
  schedulePersistGalleryOrder();
}

function handleGalleryDragStart(event, index) {
  const item = editorState.galleryImages[index];
  if (!item?.name) return;

  editorState.draggingGalleryName = item.name;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', item.name);
  event.currentTarget.classList.add('is-dragging');
}

function handleGalleryDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('is-drop-target');
}

function handleGalleryDragLeave(event) {
  event.currentTarget.classList.remove('is-drop-target');
}

async function handleGalleryDrop(event, dropIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove('is-drop-target');

  const draggedName = editorState.draggingGalleryName || event.dataTransfer.getData('text/plain');
  if (!draggedName) return;

  const fromIndex = editorState.galleryImages.findIndex((image) => image.name === draggedName);
  if (fromIndex < 0 || fromIndex === dropIndex) return;

  const reordered = [...editorState.galleryImages];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(dropIndex, 0, moved);

  editorState.galleryImages = reordered;
  syncGalleryToSiteConfig();
  renderMediaGalleryGrid(reordered);
  schedulePersistGalleryOrder();
}

function handleGalleryDragEnd(event) {
  editorState.draggingGalleryName = '';
  event.currentTarget.classList.remove('is-dragging');
  document.querySelectorAll('#edMediaGalleryGrid .media-gallery-card').forEach((card) => {
    card.classList.remove('is-drop-target');
  });
}

async function deleteSelectedGalleryImages() {
  const names = [...editorState.selectedGalleryNames].filter(Boolean);
  if (!names.length) {
    return;
  }

  const label = names.length === 1 ? '1 foto selecionada' : `${names.length} fotos selecionadas`;
  if (!confirm(`Deseja excluir ${label} da galeria? Esta ação não pode ser desfeita.`)) {
    return;
  }

  setMediaUploadStatus('Excluindo fotos selecionadas...', false, {
    variant: 'loading',
    progress: 100,
    help: 'Aguarde a confirmação.',
  });

  try {
    const response = await fetchWithAuth('/api/dashboard/media', {
      method: 'DELETE',
      body: JSON.stringify({
        eventId: state.eventId,
        type: 'gallery',
        names,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Não foi possível excluir as fotos selecionadas.');
    }

    editorState.selectedGalleryNames = [];
    await refreshGalleryFromApi(true);

    setMediaUploadStatus('Fotos selecionadas excluídas com sucesso.', false, {
      variant: 'success',
      progress: 100,
      help: 'A galeria foi atualizada.',
    });
  } catch (error) {
    setMediaUploadStatus(normalizeUploadErrorMessage(error), true, {
      variant: 'error',
      help: 'Não foi possível excluir as fotos. Tente novamente.',
    });
  }
}

function renderMediaGalleryGrid(images) {
  const grid = document.getElementById('edMediaGalleryGrid');
  const emptyEl = document.getElementById('edMediaGalleryEmpty');

  if (!grid || !emptyEl) {
    return;
  }

  if (!Array.isArray(images) || images.length === 0) {
    grid.innerHTML = '';
    emptyEl.style.display = '';
    updateMediaGalleryToolbar();
    return;
  }

  emptyEl.style.display = 'none';
  const isDesktop = typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 761px)').matches
    : true;
  grid.innerHTML = images.map((image, index) => {
    const src = escapeHtml(image?.src || '');
    const alt = escapeHtml(image?.alt || `Foto ${index + 1}`);
    const name = escapeHtml(image?.name || '');
    const checked = image?.name && editorState.selectedGalleryNames.includes(image.name) ? 'checked' : '';
    const selectedClass = checked ? ' is-selected' : '';

    return `<div class="media-gallery-card${selectedClass}"
      draggable="${isDesktop ? 'true' : 'false'}"
      ondragstart="handleGalleryDragStart(event, ${index})"
      ondragover="handleGalleryDragOver(event)"
      ondragleave="handleGalleryDragLeave(event)"
      ondrop="handleGalleryDrop(event, ${index})"
      ondragend="handleGalleryDragEnd(event)">
      <img src="${src}" alt="${alt}" onerror="this.style.opacity=0.3">
      <div class="media-gallery-card-overlay">
        <div class="media-gallery-card-top">
          <span class="media-gallery-order">${index + 1}</span>
          <input type="checkbox" class="media-gallery-check" aria-label="Selecionar ${alt}" ${checked}
            onchange="toggleGalleryImageSelectionByIndex(${index}, this.checked)">
        </div>
        <div class="media-gallery-card-bottom">
          <div class="media-gallery-actions">
            <button type="button" class="media-gallery-action-btn" title="Mover para cima" ${index === 0 ? 'disabled' : ''}
              onclick="moveGalleryImageByOffset(${index}, -1)">↑</button>
            <button type="button" class="media-gallery-action-btn" title="Mover para baixo" ${index === images.length - 1 ? 'disabled' : ''}
              onclick="moveGalleryImageByOffset(${index}, 1)">↓</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  updateMediaGalleryToolbar();
}

function ensureHistoriaGalleryArray(config) {
  if (!config.pages) config.pages = {};
  if (!config.pages.historia) config.pages.historia = {};
  if (!config.pages.historia.content) config.pages.historia.content = {};
  if (!Array.isArray(config.pages.historia.content.gallery)) {
    config.pages.historia.content.gallery = [];
  }

  return config.pages.historia.content.gallery;
}

async function uploadPixQrMedia() {
  const input = document.getElementById('edGiftPixQrFile');
  const file = input?.files?.[0];
  const button = document.getElementById('btnEdGiftPixQrUpload');

  if (!file) {
    setPixQrUploadStatus('Selecione uma imagem para o QR Pix.', true, {
      variant: 'error',
      help: 'Use JPG, PNG ou WEBP com até 10 MB.',
    });
    return;
  }

  const validationError = validateMediaFile(file);
  if (validationError) {
    setPixQrUploadStatus(validationError, true, {
      variant: 'error',
      help: 'Escolha outro arquivo e tente novamente.',
    });
    return;
  }

  setPixQrUploadStatus(`Enviando QR Pix: ${file.name}`, false, {
    variant: 'loading',
    progress: 0,
    help: 'Fazendo upload e salvando automaticamente...',
  });
  if (button) {
    button.disabled = true;
  }

  try {
    const result = await uploadMediaFile('pix-qr', file, {
      onProgress: (progress) => {
        setPixQrUploadStatus(`Enviando QR Pix: ${file.name}`, false, {
          variant: 'loading',
          progress,
          help: 'Fazendo upload e salvando automaticamente...',
        });
      },
    });
    setVal('edGiftPixQr', result.url || '');

    if (window.__SITE_CONFIG__) {
      if (!window.__SITE_CONFIG__.gift) window.__SITE_CONFIG__.gift = {};
      window.__SITE_CONFIG__.gift.pixQrImage = result.url || '';
    }

    renderPixQrPreview(result.url || '');
    markEditorDirty();

    setPixQrUploadStatus('Upload concluído. Salvando alterações...', false, {
      variant: 'loading',
      progress: 100,
      help: 'Aguarde a confirmação de salvamento.',
    });

    const saveOk = await saveEditorConfig(true);
    if (saveOk) {
      setPixQrUploadStatus('QR Pix enviado e salvo com sucesso.', false, {
        variant: 'success',
        progress: 100,
        help: 'Pronto. O convite já está atualizado.',
      });
    } else {
      setPixQrUploadStatus('QR Pix enviado, mas não foi possível salvar no evento.', true, {
        variant: 'error',
        progress: 100,
        help: 'Tente novamente pelo botão Salvar alterações do editor.',
      });
    }

    if (input) {
      input.value = '';
    }
    setFileMetaText('edGiftPixQrFileMeta', '');
  } catch (error) {
    console.error('[uploadPixQrMedia]', error);
    setPixQrUploadStatus(normalizeUploadErrorMessage(error), true, {
      variant: 'error',
      help: 'Revise o arquivo e tente novamente.',
    });
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

async function uploadHeroMedia() {
  const input = document.getElementById('edMediaHeroFile');
  const file = input?.files?.[0];
  const button = document.getElementById('btnEdMediaHeroUpload');

  if (!file) {
    setHeroUploadStatus('Selecione uma imagem para a foto principal.', true, {
      variant: 'error',
      help: 'Use JPG, PNG ou WEBP com até 10 MB.',
    });
    return;
  }

  const validationError = validateMediaFile(file);
  if (validationError) {
    setHeroUploadStatus(validationError, true, {
      variant: 'error',
      help: 'Escolha outro arquivo e tente novamente.',
    });
    return;
  }

  setHeroUploadStatus(`Enviando foto principal: ${file.name}`, false, {
    variant: 'loading',
    progress: 0,
    help: 'Fazendo upload e salvando automaticamente...',
  });
  if (button) {
    button.disabled = true;
  }

  try {
    const result = await uploadMediaFile('hero', file, {
      onProgress: (progress) => {
        setHeroUploadStatus(`Enviando foto principal: ${file.name}`, false, {
          variant: 'loading',
          progress,
          help: 'Fazendo upload e salvando automaticamente...',
        });
      },
    });
    const rawHeroUrl = String(result.url || '').trim();
    if (!isHeroMediaUrl(rawHeroUrl)) {
      throw new Error('Resposta de upload inválida para foto principal. Tente novamente.');
    }

    const heroImageUrl = appendCacheBustParam(rawHeroUrl);
    setVal('edMediaHero', heroImageUrl);

    if (window.__SITE_CONFIG__) {
      if (!window.__SITE_CONFIG__.media) window.__SITE_CONFIG__.media = {};
      window.__SITE_CONFIG__.media.heroImage = heroImageUrl;
    }

    renderMediaHeroPreview(heroImageUrl);

    markEditorDirty();

    setHeroUploadStatus('Upload concluído. Salvando alterações...', false, {
      variant: 'loading',
      progress: 100,
      help: 'Aguarde a confirmação de salvamento.',
    });

    const saveOk = await saveEditorConfig(true);
    if (saveOk) {
      setHeroUploadStatus('Foto principal enviada e salva com sucesso.', false, {
        variant: 'success',
        progress: 100,
        help: 'Pronto. O convite já está atualizado.',
      });
    } else {
      setHeroUploadStatus('Foto principal enviada, mas não foi possível salvar no evento.', true, {
        variant: 'error',
        progress: 100,
        help: 'Tente novamente pelo botão Salvar alterações do editor.',
      });
    }

    if (input) {
      input.value = '';
    }
    setFileMetaText('edMediaHeroFileMeta', '');
  } catch (error) {
    console.error('[uploadHeroMedia]', error);
    setHeroUploadStatus(normalizeUploadErrorMessage(error), true, {
      variant: 'error',
      help: 'Revise o arquivo e tente novamente.',
    });
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

async function uploadGalleryMedia() {
  const input = document.getElementById('edMediaGalleryFiles');
  const files = Array.from(input?.files || []);
  const button = document.getElementById('btnEdMediaGalleryUpload');

  if (!files.length) {
    setMediaUploadStatus('Selecione ao menos uma imagem para a galeria.', true, {
      variant: 'error',
      help: 'Use JPG, PNG ou WEBP com até 10 MB por arquivo.',
    });
    return;
  }

  const validFiles = [];
  const invalidFiles = [];

  files.forEach((file) => {
    const validationError = validateMediaFile(file);
    if (validationError) {
      invalidFiles.push(`${file.name}: ${validationError}`);
      return;
    }
    validFiles.push(file);
  });

  if (!validFiles.length) {
    setMediaUploadStatus('Nenhum arquivo válido para envio.', true, {
      variant: 'error',
      help: invalidFiles.slice(0, 2).join(' | '),
    });
    return;
  }

  setMediaUploadStatus(`Preparando envio de ${validFiles.length} imagem(ns)...`, false, {
    variant: 'loading',
    progress: 0,
    help: 'Fazendo upload e salvando automaticamente...',
  });
  if (button) {
    button.disabled = true;
  }

  const uploadedItems = [];
  const failedItems = [];

  try {
    for (let index = 0; index < validFiles.length; index += 1) {
      const file = validFiles[index];
      try {
        setMediaUploadStatus(`Enviando ${index + 1}/${validFiles.length}: ${file.name}`, false, {
          variant: 'loading',
          progress: 0,
          help: 'Fazendo upload e salvando automaticamente...',
        });
        const result = await uploadMediaFile('gallery', file, {
          onProgress: (progress) => {
            setMediaUploadStatus(`Enviando ${index + 1}/${validFiles.length}: ${file.name}`, false, {
              variant: 'loading',
              progress,
              help: 'Fazendo upload e salvando automaticamente...',
            });
          },
        });

        uploadedItems.push({
          src: result.url || '',
          alt: file.name.replace(/\.[^.]+$/, ''),
        });
      } catch (error) {
        failedItems.push(`${file.name}: ${normalizeUploadErrorMessage(error)}`);
      }
    }

    if (uploadedItems.length > 0) {
      await refreshGalleryFromApi(true);
    }

    const totalFailed = failedItems.length + invalidFiles.length;
    if (uploadedItems.length <= 0) {
      setMediaUploadStatus('Não foi possível enviar as imagens selecionadas.', true, {
        variant: 'error',
        help: [...invalidFiles, ...failedItems].slice(0, 2).join(' | '),
      });
    } else {
      if (totalFailed === 0) {
        setMediaUploadStatus(`Galeria enviada com sucesso (${uploadedItems.length} imagem(ns)).`, false, {
          variant: 'success',
          progress: 100,
          help: 'Pronto. As fotos já estão organizadas na galeria.',
        });
      } else {
        setMediaUploadStatus(
          `Upload concluído com avisos: ${uploadedItems.length} enviada(s), ${totalFailed} falha(s).`,
          false,
          {
            variant: 'warning',
            progress: 100,
            help: [...invalidFiles, ...failedItems].slice(0, 2).join(' | '),
          }
        );
      }
    }

    if (input) {
      input.value = '';
    }
    setFileMetaText('edMediaGalleryFileMeta', '');
  } catch (error) {
    console.error('[uploadGalleryMedia]', error);
    setMediaUploadStatus(normalizeUploadErrorMessage(error), true, {
      variant: 'error',
      help: 'Revise os arquivos e tente novamente.',
    });
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function reloadEditorTab() {
  if (editorState.isDirty && !confirm('Descartar todas as alterações não salvas?')) return;
  editorState.isDirty = false;
  loadEditorTab();
}

function toggleEditorSection(id) {
  const section = document.getElementById(id);
  if (section) section.classList.toggle('is-open');
}

function toggleGiftBlock(blockId, isOpen) {
  const block = document.getElementById(blockId);
  if (block) block.classList.toggle('is-open', !!isOpen);
}

// ── Seletor de tema ───────────────────────────────────────────

function populateThemeSelect(layout, currentPath) {
  const select = document.getElementById('edActiveTheme');
  if (!select) return;

  const themes = LAYOUT_THEMES[layout] || LAYOUT_THEMES.classic;
  const normalizedCurrentPath = resolveDashboardThemePath(currentPath, layout);
  const normalizedCurrentKey = extractDashboardThemeKey(currentPath);
  select.innerHTML = themes.map(t => {
    const path = `assets/layouts/${layout}/themes/${t.key}.json`;
    const sel  = (normalizedCurrentPath === path || normalizedCurrentKey === t.key) ? ' selected' : '';
    return `<option value="${escapeHtml(path)}"${sel}>${escapeHtml(t.label)}</option>`;
  }).join('');

  if (!select.value && themes.length > 0) {
    select.value = `assets/layouts/${layout}/themes/${themes[0].key}.json`;
  }
}

function onLayoutChange() {
  const layout = document.getElementById('edActiveLayout')?.value || 'classic';
  const currentTheme = document.getElementById('edActiveTheme')?.value || '';
  const currentThemeKey = extractDashboardThemeKey(currentTheme);
  populateThemeSelect(layout, currentThemeKey);
}

// ── Catálogo de presentes ─────────────────────────────────────

const DASHBOARD_DEFAULT_CATALOGS = {
  honeymoon: {
    key: 'honeymoon',
    title: 'Lista de Lua de Mel',
    subtitle: 'Sugestões para celebrar nossa primeira viagem como casados.',
    items: [
      { id: 'taxas-embarque',        name: 'Taxas de Embarque',           description: 'Ajuda com taxas e bagagens da viagem.',          amount: 140,  icon: '🧳', category: 'Lua de Mel', enabled: true },
      { id: 'traslado-aeroporto',    name: 'Traslado Aeroporto-Hotel',    description: 'Transporte seguro na chegada e saída.',           amount: 200,  icon: '🚕', category: 'Lua de Mel', enabled: true },
      { id: 'jantar-romantico',      name: 'Jantar Romântico',            description: 'Um jantar especial a dois na viagem.',            amount: 299,  icon: '🍽️', category: 'Lua de Mel', enabled: true },
      { id: 'passeio-barco',         name: 'Passeio de Barco',            description: 'Experiência inesquecível em alto-mar.',           amount: 317,  icon: '⛵', category: 'Lua de Mel', enabled: true },
      { id: 'jantar-celebracao',     name: 'Jantar de Celebração',        description: 'Noite especial para celebrar esse momento.',      amount: 390,  icon: '🥂', category: 'Lua de Mel', enabled: true },
      { id: 'spa-casal',             name: 'Spa para o Casal',            description: 'Momento de relaxamento durante a lua de mel.',    amount: 470,  icon: '🧖', category: 'Lua de Mel', enabled: true },
      { id: 'hospedagem-1-noite',    name: 'Hospedagem de 1 Noite',       description: 'Contribuição para uma noite no hotel.',           amount: 560,  icon: '🏨', category: 'Lua de Mel', enabled: true },
      { id: 'tour-privativo',        name: 'Tour Privativo',              description: 'Um dia de passeio com guia local.',               amount: 650,  icon: '🗺️', category: 'Lua de Mel', enabled: true },
      { id: 'ensaio-fotografico',    name: 'Ensaio Fotográfico',          description: 'Registro do nosso começo em viagem.',             amount: 740,  icon: '📸', category: 'Lua de Mel', enabled: true },
      { id: 'experiencia-premium',   name: 'Experiência Premium',         description: 'Uma experiência única na viagem.',                amount: 820,  icon: '✨', category: 'Lua de Mel', enabled: true },
      { id: 'passagem-aerea-casal',  name: 'Passagem Aérea do Casal',     description: 'Contribuição para nossas passagens de ida.',      amount: 849,  icon: '✈️', category: 'Lua de Mel', enabled: true },
      { id: 'cota-lua-de-mel',       name: 'Cota Lua de Mel Completa',    description: 'Contribuição para tornar essa viagem perfeita.',  amount: 999,  icon: '💛', category: 'Lua de Mel', enabled: true }
    ]
  },
  home: {
    key: 'home',
    title: 'Lista para Casa',
    subtitle: 'Sugestões para montar e deixar nosso novo lar ainda mais especial.',
    items: [
      { id: 'jogo-panelas',   name: 'Jogo de Panelas',      description: 'Para preparar muitas receitas no novo lar.',     amount: 220, icon: '🍳', category: 'Casa', enabled: true },
      { id: 'airfryer',       name: 'Airfryer',             description: 'Praticidade para o dia a dia da casa.',          amount: 380, icon: '🍟', category: 'Casa', enabled: true },
      { id: 'liquidificador', name: 'Liquidificador',       description: 'Essencial para sucos, vitaminas e receitas.',    amount: 190, icon: '🥤', category: 'Casa', enabled: true },
      { id: 'cafeteira',      name: 'Cafeteira',            description: 'Para começar o dia com energia e carinho.',      amount: 260, icon: '☕', category: 'Casa', enabled: true },
      { id: 'jogo-cama',      name: 'Jogo de Cama',         description: 'Conforto para noites ainda mais especiais.',     amount: 210, icon: '🛏️', category: 'Casa', enabled: true },
      { id: 'jogo-toalhas',   name: 'Jogo de Toalhas',      description: 'Um mimo útil para o enxoval.',                  amount: 130, icon: '🧺', category: 'Casa', enabled: true },
      { id: 'faqueiro',       name: 'Faqueiro',             description: 'Para receber visitas com elegância.',            amount: 170, icon: '🍴', category: 'Casa', enabled: true },
      { id: 'aparelho-jantar',name: 'Aparelho de Jantar',   description: 'Para celebrar refeições em família.',            amount: 320, icon: '🍽️', category: 'Casa', enabled: true },
      { id: 'aspirador',      name: 'Aspirador de Pó',      description: 'Mais praticidade na rotina da limpeza.',         amount: 450, icon: '🧹', category: 'Casa', enabled: true },
      { id: 'microondas',     name: 'Micro-ondas',          description: 'Agilidade para refeições e aquecimentos.',       amount: 590, icon: '🔥', category: 'Casa', enabled: true },
      { id: 'rack-sala',      name: 'Rack para Sala',       description: 'Um toque especial para o cantinho da sala.',     amount: 720, icon: '🛋️', category: 'Casa', enabled: true },
      { id: 'geladeira',      name: 'Cota Geladeira',       description: 'Contribuição para um item essencial da casa.',   amount: 990, icon: '🧊', category: 'Casa', enabled: true }
    ]
  },
  couple: {
    key: 'couple',
    title: 'Nosso Lar',
    subtitle: 'Itens especiais para elevar o dia a dia de quem já divide o mesmo espaço.',
    items: [
      { id: 'c1',  name: 'Jogo de Panelas Premium',     description: 'Linha profissional antiaderente.',       amount: 890,  icon: '🍳', category: 'Nosso Lar', enabled: true },
      { id: 'c2',  name: 'Máquina de Café Espresso',    description: 'Café de barista em casa.',               amount: 1200, icon: '☕', category: 'Nosso Lar', enabled: true },
      { id: 'c3',  name: 'Robô Aspirador',              description: 'Limpeza automática e inteligente.',      amount: 1500, icon: '🤖', category: 'Nosso Lar', enabled: true },
      { id: 'c4',  name: 'Adega Climatizada',           description: 'Para os momentos especiais a dois.',     amount: 1800, icon: '🍷', category: 'Nosso Lar', enabled: true },
      { id: 'c5',  name: 'Smart TV 55"',                description: 'Experiência cinematográfica em casa.',   amount: 2500, icon: '📺', category: 'Nosso Lar', enabled: true },
      { id: 'c6',  name: 'Jogo de Cama King Premium',   description: 'Algodão egípcio 400 fios.',             amount: 650,  icon: '🛏️', category: 'Nosso Lar', enabled: true },
      { id: 'c7',  name: 'Fritadeira Airfryer XL',      description: 'Cozinhar saudável e prático.',          amount: 480,  icon: '🥘', category: 'Nosso Lar', enabled: true },
      { id: 'c8',  name: 'Purificador de Água',         description: 'Água gelada e filtrada sempre.',        amount: 720,  icon: '💧', category: 'Nosso Lar', enabled: true },
      { id: 'c9',  name: 'Conjunto de Toalhas Finas',   description: 'Coleção hoteleira de linho.',           amount: 380,  icon: '🛁', category: 'Nosso Lar', enabled: true },
      { id: 'c10', name: 'Liquidificador de Alta Pot.', description: 'Vitaminas e smoothies perfeitos.',      amount: 560,  icon: '🥤', category: 'Nosso Lar', enabled: true },
      { id: 'c11', name: 'Jogo de Facas Profissional',  description: 'Aço alemão com estojo.',                amount: 420,  icon: '🔪', category: 'Nosso Lar', enabled: true },
      { id: 'c12', name: 'Caixa de Som Premium',        description: 'Som ambiente para todo o lar.',         amount: 900,  icon: '🔊', category: 'Nosso Lar', enabled: true }
    ]
  },
  wedding: {
    key: 'wedding',
    title: 'Ajuda no Casamento',
    subtitle: 'Contribua para tornar esse dia ainda mais especial e inesquecível.',
    items: [
      { id: 'w1',  name: 'Decoração Floral',            description: 'Flores e arranjos para o grande dia.',  amount: 1500, icon: '💐', category: 'Casamento', enabled: true },
      { id: 'w2',  name: 'Bolo de Casamento',           description: 'Bolo personalizado para a festa.',      amount: 1200, icon: '🎂', category: 'Casamento', enabled: true },
      { id: 'w3',  name: 'Fotografia',                  description: 'Registro profissional da cerimônia.',   amount: 3500, icon: '📷', category: 'Casamento', enabled: true },
      { id: 'w4',  name: 'Filmagem',                    description: 'Vídeo cinematográfico do casamento.',   amount: 3000, icon: '🎥', category: 'Casamento', enabled: true },
      { id: 'w5',  name: 'DJ e Sonorização',            description: 'Música para animar a festa toda.',      amount: 2500, icon: '🎧', category: 'Casamento', enabled: true },
      { id: 'w6',  name: 'Bem-casados',                 description: 'Lembrancinhas para os convidados.',     amount: 800,  icon: '🍬', category: 'Casamento', enabled: true },
      { id: 'w7',  name: 'Convites Impressos',          description: 'Arte e impressão dos convites.',        amount: 600,  icon: '✉️', category: 'Casamento', enabled: true },
      { id: 'w8',  name: 'Maquiagem da Noiva',          description: 'Make profissional para a noiva.',       amount: 900,  icon: '💄', category: 'Casamento', enabled: true },
      { id: 'w9',  name: 'Aluguel do Espaço',           description: 'Contribuição para o local da festa.',   amount: 5000, icon: '🏛️', category: 'Casamento', enabled: true },
      { id: 'w10', name: 'Doces e Mesa de Guloseimas',  description: 'Candy bar para a festa.',               amount: 1000, icon: '🍭', category: 'Casamento', enabled: true },
      { id: 'w11', name: 'Cerimonialista',              description: 'Coordenação profissional do evento.',   amount: 2000, icon: '📋', category: 'Casamento', enabled: true },
      { id: 'w12', name: 'Contribuição Livre',          description: 'Qualquer valor é bem-vindo e amado.',   amount: 200,  icon: '💛', category: 'Casamento', enabled: true }
    ]
  }
};

function getCatalogMetaByKey(key) {
  const catalog = DASHBOARD_DEFAULT_CATALOGS[key] || DASHBOARD_DEFAULT_CATALOGS.honeymoon;
  return {
    key: catalog.key || 'honeymoon',
    title: catalog.title || 'Lista de Lua de Mel',
    subtitle: catalog.subtitle || '',
  };
}

function syncCatalogMetaFields(key) {
  const meta = getCatalogMetaByKey(key);
  setVal('edGiftCatalogTitle', meta.title);
  setVal('edGiftCatalogSubtitle', meta.subtitle);
}

function onCatalogTypeChange(key) {
  const prevKey = window.__catalogType || 'honeymoon'; // captura ANTES de mudar
  window.__catalogType = key;
  const currentItems = editorState.catalogItems || [];
  if (currentItems.length === 0) {
    loadDefaultCatalogItems(key);
  } else {
    const catalog = DASHBOARD_DEFAULT_CATALOGS[key];
    const label = catalog ? catalog.title : key;
    if (confirm('Trocar a lista vai substituir os itens atuais pelos itens padrão de "' + label + '". Deseja continuar?')) {
      loadDefaultCatalogItems(key);
    } else {
      // reverte o radio para o valor anterior sem disparar onchange
      window.__catalogType = prevKey;
      const radios = document.querySelectorAll('input[name="catalogType"]');
      radios.forEach(r => { r.checked = (r.value === prevKey); });
      syncCatalogMetaFields(prevKey);
    }
  }
}

function loadDefaultCatalogItems(key) {
  const catalog = DASHBOARD_DEFAULT_CATALOGS[key];
  if (!catalog) return;
  window.__catalogType = key;
  // Sempre sincroniza título/subtítulo com o tipo de lista selecionado
  syncCatalogMetaFields(key);
  // Substitui os itens do editor
  editorState.catalogItems = catalog.items.map(i => ({
    name: i.name,
    amount: i.amount,
    description: i.description || '',
    icon: i.icon || '💛',
    category: i.category || '',
    id: i.id,
    enabled: true
  }));
  renderCatalogItems();
  markEditorDirty();
}

function renderCatalogItems() {
  const container = document.getElementById('catalogItemsList');
  if (!container) return;

  if (editorState.catalogItems.length === 0) {
    container.innerHTML = `<p class="field-hint" style="text-align:center;padding:12px 0">
      Nenhum item. Clique em "+ Adicionar item" para começar.</p>`;
    return;
  }

  container.innerHTML = editorState.catalogItems.map((item, i) => `
    <div class="catalog-item">
      <input type="text" class="field-input emoji-input" value="${escapeHtml(item.icon || '💛')}"
             placeholder="😊" title="Emoji do presente"
             oninput="updateCatalogItem(${i},'icon',this.value)">
      <input type="text" class="field-input sm" value="${escapeHtml(item.name || '')}"
             placeholder="Descrição do presente"
             oninput="updateCatalogItem(${i},'name',this.value)">
      <input type="number" class="field-input sm" value="${item.amount ?? ''}"
             min="0" step="10" placeholder="Valor (R$)"
             oninput="updateCatalogItem(${i},'amount',Number(this.value))">
      <button type="button" class="btn-icon-sm" onclick="removeCatalogItem(${i})" aria-label="Remover item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>`).join('');
}

function addCatalogItem() {
  editorState.catalogItems.push({ name: '', amount: 0, icon: '💛' });
  renderCatalogItems();
  markEditorDirty();
  const rows = document.querySelectorAll('#catalogItemsList .catalog-item');
  if (rows.length > 0) rows[rows.length - 1].querySelector('input')?.focus();
}

function removeCatalogItem(index) {
  editorState.catalogItems.splice(index, 1);
  renderCatalogItems();
  markEditorDirty();
}

function updateCatalogItem(index, field, value) {
  if (editorState.catalogItems[index]) {
    editorState.catalogItems[index][field] = value;
    markEditorDirty();
  }
}

// ── FAQ ───────────────────────────────────────────────────────

function renderFaqItems() {
  const container = document.getElementById('faqItemsList');
  if (!container) return;

  if (editorState.faqItems.length === 0) {
    container.innerHTML = `<p class="field-hint" style="text-align:center;padding:12px 0">
      Nenhuma pergunta. Clique em "+ Adicionar pergunta" para começar.</p>`;
    return;
  }

  container.innerHTML = editorState.faqItems.map((item, i) => `
    <div class="faq-item-block">
      <div class="faq-item-header">
        <span class="faq-item-num">Pergunta ${i + 1}</span>
        <button type="button" class="btn-icon-sm" onclick="removeFaqItem(${i})" aria-label="Remover pergunta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="field" style="margin-bottom:8px">
        <label class="field-label">Pergunta</label>
        <input type="text" class="field-input sm" value="${escapeHtml(item.question || '')}"
               placeholder="ex: Tem estacionamento no local?"
               oninput="updateFaqItem(${i},'question',this.value)">
      </div>
      <div class="field">
        <label class="field-label">Resposta</label>
        <textarea class="field-input sm" rows="3"
                  placeholder="Digite a resposta..."
                  oninput="updateFaqItem(${i},'answer',this.value)">${escapeHtml(item.answer || '')}</textarea>
      </div>
    </div>`).join('');
}

function addFaqItem() {
  editorState.faqItems.push({ question: '', answer: '' });
  renderFaqItems();
  markEditorDirty();
  const blocks = document.querySelectorAll('#faqItemsList .faq-item-block');
  if (blocks.length > 0) blocks[blocks.length - 1].querySelector('input')?.focus();
}

function removeFaqItem(index) {
  editorState.faqItems.splice(index, 1);
  renderFaqItems();
  markEditorDirty();
}

function updateFaqItem(index, field, value) {
  if (editorState.faqItems[index]) {
    editorState.faqItems[index][field] = value;
    markEditorDirty();
  }
}

// ── Grid de páginas extras ────────────────────────────────────

function renderPagesGrid(pages) {
  const grid = document.getElementById('edPagesGrid');
  if (!grid) return;

  const keys = ['historia', 'faq', 'hospedagem', 'mensagem', 'musica', 'presente'];
  grid.innerHTML = keys.map(key => {
    const page    = pages[key] || {};
    const enabled = !!page.enabled;
    return `
    <div class="page-card">
      <div class="page-card-key">${escapeHtml(key)}</div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <span class="page-card-name">${escapeHtml(PAGE_LABELS[key] || key)}</span>
        <label class="toggle" style="flex-shrink:0" onclick="event.stopPropagation()">
          <input type="checkbox" class="toggle-input" id="edPage_${key}_enabled"
                 ${enabled ? 'checked' : ''} onchange="markEditorDirty()">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
      </div>
    </div>`;
  }).join('');
}

// ── Coleta e salva ────────────────────────────────────────────

function collectEditorValues() {
  const config = JSON.parse(JSON.stringify(editorState.originalConfig || window.__SITE_CONFIG__ || {}));

  // Casal & Evento
  if (!config.couple) config.couple = {};
  config.couple.names    = document.getElementById('edCoupleNames')?.value.trim()    || config.couple.names;
  config.couple.subtitle = document.getElementById('edCoupleSubtitle')?.value.trim() || config.couple.subtitle || '';
  config.couple.bride_name = document.getElementById('edBrideName')?.value.trim() || '';
  config.couple.groom_name = document.getElementById('edGroomName')?.value.trim() || '';

  if (!config.event) config.event = {};
  // Reconstrói ISO a partir de date (YYYY-MM-DD) + time (HH:MM)
  const _datePart = document.getElementById('edEventDate')?.value.trim() || '';
  const _timePart = (document.getElementById('edEventTime')?.value.trim() || '').replace(/h$/i, ':00').replace(/^(\d{1,2})$/, '$1:00');
  if (_datePart) {
    const _timeNorm = /^\d{2}:\d{2}/.test(_timePart) ? _timePart.slice(0, 5) : '00:00';
    config.event.date = `${_datePart}T${_timeNorm}:00`;
  }
  config.event.time        = document.getElementById('edEventTime')?.value.trim()        || '';
  config.event.heroDate    = document.getElementById('edEventHeroDate')?.value.trim()    || '';
  config.event.displayDate = document.getElementById('edEventDisplayDate')?.value.trim() || '';
  // detailDate = formato "06 Set 2026" — gera da data se possível, senão usa displayDate
  if (_datePart) {
    const _fmt = generateDateFormats(_datePart);
    config.event.detailDate = _fmt ? _fmt.detailDate : config.event.displayDate;
  } else {
    config.event.detailDate = config.event.displayDate;
  }
  config.event.weekday     = document.getElementById('edEventWeekday')?.value.trim()     || '';
  config.event.locationName = document.getElementById('edEventLocation')?.value.trim()    || '';
  config.event.locationCity = document.getElementById('edEventCity')?.value.trim()        || '';
  config.event.mapsLink     = document.getElementById('edEventMapsLink')?.value.trim()    || '';
  config.event.venueAddress = document.getElementById('edEventVenueAddress')?.value.trim() || '';
  const lat = parseFloat(document.getElementById('edEventLat')?.value);
  const lng = parseFloat(document.getElementById('edEventLng')?.value);
  if (!isNaN(lat) && !isNaN(lng)) config.event.venueCoordinates = { lat, lng };
  config.event.mapEnabled = document.getElementById('edEventMapEnabled')?.checked ?? false;

  // Tema
  config.activeLayout = document.getElementById('edActiveLayout')?.value || 'classic';
  const rawThemeValue = document.getElementById('edActiveTheme')?.value || config.activeTheme;
  config.activeTheme = resolveDashboardThemePath(rawThemeValue, config.activeLayout) || config.activeTheme;

  // WhatsApp & RSVP
  if (!config.whatsapp) config.whatsapp = {};
  config.whatsapp.destinationPhone = document.getElementById('edWaPhone')?.value.trim()     || '';
  config.whatsapp.recipientName    = document.getElementById('edWaRecipient')?.value.trim() || '';
  if (!config.whatsapp.messages) config.whatsapp.messages = {};
  config.whatsapp.messages.attending    = document.getElementById('edWaMsgAttending')?.value    || '';
  config.whatsapp.messages.notAttending = document.getElementById('edWaMsgNotAttending')?.value || '';
  if (!config.rsvp) config.rsvp = {};
  config.rsvp.supabaseEnabled = document.getElementById('edRsvpSupabase')?.checked ?? false;

  // Presentes
  if (!config.gift) config.gift = {};
  config.gift.pixEnabled       = document.getElementById('edGiftPixEnabled')?.checked   ?? false;
  config.gift.pixKey            = document.getElementById('edGiftPixKey')?.value.trim()  || '';
  config.gift.pixQrImage        = document.getElementById('edGiftPixQr')?.value.trim()   || '';
  config.gift.cardPaymentEnabled = document.getElementById('edGiftCardEnabled')?.checked ?? false;
  config.gift.cardPaymentLink    = document.getElementById('edGiftCardLink')?.value.trim() || '';
  config.gift.catalogEnabled     = document.getElementById('edGiftCatalogEnabled')?.checked ?? false;
  config.gift.external = {
    enabled: document.getElementById('edExternalEnabled')?.checked  ?? false,
    store:   document.getElementById('edExternalStore')?.value.trim()  || '',
    url:     document.getElementById('edExternalUrl')?.value.trim()    || '',
    label:   document.getElementById('edExternalLabel')?.value.trim()  || 'Ver lista completa',
  };
  if (!config.gift.catalog) config.gift.catalog = {};
  config.gift.catalog.key      = window.__catalogType || 'honeymoon';
  config.gift.activeCatalogKey = window.__catalogType || 'honeymoon';
  if (!config.gift.catalogs) config.gift.catalogs = {};
  config.gift.catalogs.activeKey = window.__catalogType || 'honeymoon';
  const catalogMeta = getCatalogMetaByKey(window.__catalogType || 'honeymoon');
  config.gift.catalog.title    = catalogMeta.title;
  config.gift.catalog.subtitle = catalogMeta.subtitle;
  config.gift.catalog.items    = editorState.catalogItems
    .filter(it => (it.name || '').trim())
    .map((it, i) => ({ id: i + 1, name: it.name.trim(), amount: Number(it.amount) || 0, icon: it.icon || '💛' }));

  // Fotos & Mídia
  if (!config.media) config.media = {};
  config.media.heroImage = document.getElementById('edMediaHero')?.value.trim() || '';
  if (!config.media.tracks)      config.media.tracks      = {};
  if (!config.media.tracks.main) config.media.tracks.main = {};
  if (!config.media.tracks.gift) config.media.tracks.gift = {};
  const _musicEnabled = document.getElementById('edTrackEnabled')?.checked ?? true;
  const _musicSrc     = document.getElementById('edTrackSrc')?.value.trim()     || '';
  const _musicVolume  = (parseFloat(document.getElementById('edTrackVolume')?.value) || 14) / 100;
  const _musicStart   = parseInt(document.getElementById('edTrackStart')?.value)    || 0;
  ['main', 'gift'].forEach((ctx) => {
    config.media.tracks[ctx].enabled   = _musicEnabled;
    config.media.tracks[ctx].src       = _musicSrc;
    config.media.tracks[ctx].volume    = _musicVolume;
    config.media.tracks[ctx].startTime = _musicStart;
  });

  // Páginas extras
  if (!config.pages) config.pages = {};
  ['historia', 'faq', 'hospedagem', 'mensagem', 'musica', 'presente'].forEach(key => {
    if (!config.pages[key]) config.pages[key] = {};
    config.pages[key].enabled = document.getElementById(`edPage_${key}_enabled`)?.checked ?? false;
  });

  // Capítulos de Nossa História
  if (!config.pages.historia) config.pages.historia = {};
  if (!config.pages.historia.content) config.pages.historia.content = {};
  config.pages.historia.content.chapters = [0, 1, 2].map(i => ({
    year:  document.getElementById(`edChapter${i}Year`)?.value.trim()  || '',
    title: document.getElementById(`edChapter${i}Title`)?.value.trim() || '',
    text:  document.getElementById(`edChapter${i}Text`)?.value.trim()  || '',
  }));

  // FAQ
  if (!config.pages.faq) config.pages.faq = {};
  if (!config.pages.faq.content) config.pages.faq.content = {};
  config.pages.faq.content.items = editorState.faqItems
    .filter(it => (it.question || '').trim())
    .map(it => ({ question: it.question.trim(), answer: it.answer.trim() }));

  // Imagens da galeria não têm campo de formulário — vivem em window.__SITE_CONFIG__
  // (modificado pelos uploads). Preserva o estado vivo para não descartar ao salvar.
  const liveGallery = window.__SITE_CONFIG__?.pages?.historia?.content?.gallery;
  if (Array.isArray(liveGallery)) {
    config.pages.historia.content.gallery = liveGallery;
  }

  return config;
}

async function saveEditorConfig(silent = false) {
  const config = collectEditorValues();

  if (!state.eventId) {
    if (!silent) updateEditorSaveStatus('Evento não carregado — recarregue o dashboard');
    return false;
  }

  try {
    const response = await fetchWithAuth('/api/dashboard/event', {
      method: 'PATCH',
      body: JSON.stringify({ eventId: state.eventId, config }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (!silent) updateEditorSaveStatus(data.error || 'Erro ao salvar no servidor');
      return false;
    }

    syncDashboardEventSlug(data?.event?.slug);
    const savedConfig = data?.config && typeof data.config === 'object' ? data.config : config;
    window.__SITE_CONFIG__ = savedConfig;
    editorState.isDirty = false;
    editorState.originalConfig = JSON.parse(JSON.stringify(savedConfig));
    applySiteConfig(savedConfig);
    if (!silent) {
      updateEditorSaveStatus('As informações do seu convite foram salvas ✓');
      showSectionFootersSaved();
    }

    return true;
  } catch (error) {
    console.error('[saveEditorConfig]', error);
    if (!silent) updateEditorSaveStatus('Erro ao salvar no servidor');
    return false;
  }
}

// ============================================================
// WIZARD DE ONBOARDING
// ============================================================

// Adicione novas chaves aqui quando criar novos temas em assets/layouts/classic/themes/
const WIZARD_THEME_KEYS = [
  'classic-gold',
  'classic-silver',
  'classic-gold-light',
  'classic-silver-light',
];
const WIZARD_SLUG_MIN_LENGTH = 3;
const WIZARD_SLUG_DEBOUNCE_MS = 2000;
const WIZARD_SLUG_CACHE_TTL_MS = 30_000;

let _wizardStep = 1;
let _wizardSelectedTheme = 'classic-gold';
let _wizardLoadedThemes = [];
let _wizardSlugValidationTimer = null;
let _wizardSlugValidationToken = 0;
let _wizardSlugState = 'idle';
let _wizardSlugBlockedUntil = 0;
const _wizardSlugValidationCache = new Map();

function _normalizeWizardSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function _normalizeWizardSlugInput(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '');
}

function _setWizardSlugStatus(stateName, message) {
  const statusEl = document.getElementById('wzSlugStatus');
  if (!statusEl) return;

  const paletteByState = {
    idle: 'var(--text-dim)',
    loading: 'var(--text-dim)',
    valid: 'var(--success)',
    invalid: 'var(--danger)',
  };

  _wizardSlugState = stateName;
  statusEl.textContent = message || '';
  statusEl.style.color = paletteByState[stateName] || 'var(--text-dim)';
}

function _parseWizardNames(displayName) {
  const source = String(displayName || '').trim();
  if (!source) {
    return { brideName: '', groomName: '' };
  }

  const separators = [' & ', ' e ', ' + ', '&', '+'];
  const matchedSeparator = separators.find((separator) => source.includes(separator));
  if (!matchedSeparator) {
    return { brideName: source, groomName: '' };
  }

  const parts = source.split(matchedSeparator).map((part) => part.trim()).filter(Boolean);
  return {
    brideName: parts[0] || '',
    groomName: parts[1] || '',
  };
}

function _formatWizardDateForSlug(dateValue) {
  const source = String(dateValue || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    return 'dd-mm-aaaa';
  }

  const [year, month, day] = source.split('-');
  return `${day}-${month}-${year}`;
}

function _buildWizardAutoSlugExample() {
  const displayName = _wizardDisplayName();
  const names = _parseWizardNames(displayName);
  const bride = _normalizeWizardSlug(names.brideName || 'nome-noiva');
  const groom = _normalizeWizardSlug(names.groomName || 'nome-noivo');
  const dateText = _formatWizardDateForSlug(document.getElementById('wzDate')?.value || '');
  return `${bride}-${groom}-${dateText}`;
}

function _updateWizardSlugExampleText() {
  const exampleEl = document.getElementById('wzSlugExample');
  if (!exampleEl) {
    return;
  }

  const slugInput = document.getElementById('wzSlug');
  const typedSlug = _normalizeWizardSlugInput(slugInput?.value || '');
  if (typedSlug) {
    exampleEl.textContent = `Seu link vai ficar assim: www.devazi.app/${typedSlug}`;
    return;
  }

  exampleEl.textContent = `Seu link vai ficar assim: www.devazi.app/${_buildWizardAutoSlugExample()}`;
}

function _setWizardSlugFieldAvailability() {
  const slugInput = document.getElementById('wzSlug');

  if (!slugInput) {
    return;
  }

  slugInput.disabled = false;
  slugInput.classList.remove('field-auto');

  _setWizardSlugStatus('idle', 'Você pode personalizar a URL ou deixar em branco para gerar automaticamente.');
}

function _populateWizardTimeOptions(defaultValue = '17:00') {
  const select = document.getElementById('wzTime');
  if (!select || select.tagName !== 'SELECT') {
    return;
  }

  const normalizedDefault = /^\d{2}:\d{2}:\d{2}$/.test(String(defaultValue || ''))
    ? String(defaultValue).slice(0, 5)
    : String(defaultValue || '17:00');

  if (select.options.length > 0) {
    if (normalizedDefault) {
      select.value = normalizedDefault;
    }
    return;
  }

  const fragment = document.createDocumentFragment();

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 15) {
      const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const option = document.createElement('option');
      option.value = label;
      option.textContent = label;
      fragment.appendChild(option);
    }
  }

  select.appendChild(fragment);
  select.value = normalizedDefault && select.querySelector(`option[value="${normalizedDefault}"]`) ? normalizedDefault : '17:00';
}

async function _validateWizardSlugAvailability({ immediate = false } = {}) {
  const input = document.getElementById('wzSlug');
  if (!input) return false;

  const normalizedInput = _normalizeWizardSlugInput(input.value);
  input.value = normalizedInput;
  _updateWizardSlugExampleText();

  if (!immediate && normalizedInput.endsWith('-')) {
    _setWizardSlugStatus('idle', 'Continue digitando para validar a disponibilidade da URL.');
    return false;
  }

  const normalizedSlug = _normalizeWizardSlug(normalizedInput);

  if (immediate && normalizedSlug !== normalizedInput) {
    input.value = normalizedSlug;
    _updateWizardSlugExampleText();
  }

  if (!normalizedSlug) {
    _setWizardSlugStatus('idle', 'Sem problema: se deixar em branco, criamos a URL automaticamente.');
    return true;
  }

  if (normalizedSlug.length < WIZARD_SLUG_MIN_LENGTH) {
    _setWizardSlugStatus('invalid', `A URL precisa ter ao menos ${WIZARD_SLUG_MIN_LENGTH} caracteres.`);
    return false;
  }

  const now = Date.now();
  if (_wizardSlugBlockedUntil > now) {
    const remainingSec = Math.max(1, Math.ceil((_wizardSlugBlockedUntil - now) / 1000));
    _setWizardSlugStatus('invalid', `Muitas tentativas. Aguarde ${remainingSec}s para tentar de novo.`);
    return false;
  }

  const cachedResult = _wizardSlugValidationCache.get(normalizedSlug);
  if (cachedResult && (now - cachedResult.timestamp) <= WIZARD_SLUG_CACHE_TTL_MS) {
    _setWizardSlugStatus(cachedResult.state, cachedResult.message);
    return cachedResult.valid;
  }

  const requestToken = ++_wizardSlugValidationToken;

  const performCheck = async () => {
    _setWizardSlugStatus('loading', 'Validando disponibilidade...');

    try {
      const params = new URLSearchParams({
        mode: 'check-slug',
        slug: normalizedSlug,
      });
      if (state.eventSlug) {
        params.set('currentSlug', state.eventSlug);
      }

      const response = await fetch(`/api/event-config?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));

      if (requestToken !== _wizardSlugValidationToken) {
        return false;
      }

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfterHeader = Number.parseInt(response.headers.get('Retry-After') || '15', 10);
          const retryAfterSec = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
            ? retryAfterHeader
            : 15;
          _wizardSlugBlockedUntil = Date.now() + (retryAfterSec * 1000);
          _setWizardSlugStatus('invalid', `Muitas tentativas. Aguarde ${retryAfterSec}s para tentar de novo.`);
          return false;
        }

        _setWizardSlugStatus('invalid', payload.error || 'Não foi possível validar a URL.');
        return false;
      }

      if (payload.available === true) {
        _wizardSlugValidationCache.set(normalizedSlug, {
          timestamp: Date.now(),
          valid: true,
          state: 'valid',
          message: 'URL disponível para publicar.',
        });
        _setWizardSlugStatus('valid', 'URL disponível para publicar.');
        return true;
      }

      if (payload.reason === 'reserved') {
        _setWizardSlugStatus('invalid', 'Essa URL é reservada pelo sistema.');
        return false;
      }

      _wizardSlugValidationCache.set(normalizedSlug, {
        timestamp: Date.now(),
        valid: false,
        state: 'invalid',
        message: 'Essa URL já está em uso.',
      });
      _setWizardSlugStatus('invalid', 'Essa URL já está em uso.');
      return false;
    } catch (error) {
      if (requestToken !== _wizardSlugValidationToken) {
        return false;
      }

      _setWizardSlugStatus('invalid', 'Erro ao validar URL. Tente novamente.');
      return false;
    }
  };

  if (immediate) {
    return performCheck();
  }

  if (_wizardSlugValidationTimer) {
    clearTimeout(_wizardSlugValidationTimer);
  }

  _setWizardSlugStatus('loading', 'Verificando disponibilidade...');

  return new Promise((resolve) => {
    _wizardSlugValidationTimer = setTimeout(async () => {
      _wizardSlugValidationTimer = null;
      const result = await performCheck();
      resolve(result);
    }, WIZARD_SLUG_DEBOUNCE_MS);
  });
}

function isFirstTimeUser(config) {
  const loc = config?.event?.locationName || '';
  return loc === '' || loc === 'Definir local';
}

async function _loadWizardThemes() {
  if (_wizardLoadedThemes.length) return _wizardLoadedThemes;
  const results = await Promise.allSettled(
    WIZARD_THEME_KEYS.map(key =>
      fetch(`/assets/layouts/classic/themes/${key}.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => data ? { key, data } : null)
        .catch(() => null)
    )
  );
  _wizardLoadedThemes = results
    .map(r => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean);
  return _wizardLoadedThemes;
}

function _themeColors(themeData) {
  const c = themeData?.colors || {};
  return {
    bg:          c.background   || '#0f0d0b',
    primary:     c.primary      || '#c9a84c',
    primarySoft: c.primarySoft  || c.primary || '#d4b480',
    text:        c.text         || '#faf7f2',
    textDim:     c.textDim      || 'rgba(250,247,242,.45)',
    grid:        c.pageGridLine || 'rgba(255,255,255,.015)',
    border:      c.border       || 'rgba(192,160,96,.25)',
  };
}

function _wizardDisplayName() {
  return document.getElementById('wzDisplayName')?.value.trim() || '';
}

function _parseDisplayNameParts(displayName) {
  const input = String(displayName || '').trim();
  
  // Try common separators in order
  const separators = [' e ', ' & ', ' + ', ' - '];
  
  for (const sep of separators) {
    if (input.includes(sep)) {
      const parts = input.split(sep);
      if (parts.length >= 2) {
        return {
          first: parts[0].trim(),
          second: parts.slice(1).join(sep).trim(),
        };
      }
    }
  }
  
  // Fallback: return empty if parsing fails
  return { first: '', second: '' };
}

function _updateWizardPreview() {
  const previewCard = document.getElementById('wzPreviewCard');
  if (!previewCard) return;

  const theme   = _wizardLoadedThemes.find(t => t.key === _wizardSelectedTheme);
  const display = _wizardDisplayName();
  const dateRaw = document.getElementById('wzDate')?.value || '';

  const previewNames = document.getElementById('wzPreviewNames');
  if (previewNames) previewNames.textContent = display || 'Nome & Nome';

  const previewDate = document.getElementById('wzPreviewDate');
  if (previewDate) {
    if (dateRaw) {
      const d = new Date(`${dateRaw}T12:00:00`);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        previewDate.textContent = `${dd} · ${mm} · ${d.getFullYear()}`;
      }
    } else {
      previewDate.textContent = '· · ·';
    }
  }

  if (theme) {
    const cols = _themeColors(theme.data);
    previewCard.style.background  = cols.bg;
    previewCard.style.borderColor = cols.border;
    previewCard.style.setProperty('--wz-primary',  cols.primarySoft);
    previewCard.style.setProperty('--wz-text',     cols.text);
    previewCard.style.setProperty('--wz-text-dim', cols.textDim);
    previewCard.style.setProperty('--wz-grid',     cols.grid);
  }
}

function renderWizardThemes() {
  const container = document.getElementById('wizardThemes');
  if (!container) return;
  container.innerHTML = '<div class="wizard-themes-loading">Carregando temas…</div>';

  _loadWizardThemes().then(themes => {
    container.innerHTML = '';
    themes.forEach(({ key, data }) => {
      const cols  = _themeColors(data);
      const label = data?.meta?.name || data?.meta?.displayName || key;
      const isSelected = key === _wizardSelectedTheme;

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'wizard-theme-card' + (isSelected ? ' is-selected' : '');
      card.dataset.themeKey = key;
      card.innerHTML = `
        <div class="wizard-theme-swatch" style="background:${cols.bg};border-color:${isSelected ? cols.primary : 'transparent'}">
          <div class="wizard-theme-accent" style="background:${cols.primary}"></div>
          <div class="wizard-theme-lines">
            <div style="background:${cols.text}40;width:60%;height:4px;border-radius:2px;margin-bottom:5px"></div>
            <div style="background:${cols.text}25;width:80%;height:3px;border-radius:2px;margin-bottom:5px"></div>
            <div style="background:${cols.primary}80;width:40%;height:3px;border-radius:2px"></div>
          </div>
        </div>
        <span class="wizard-theme-label">${label}</span>
      `;
      card.addEventListener('click', () => {
        _wizardSelectedTheme = key;
        container.querySelectorAll('.wizard-theme-card').forEach(c => {
          const sel = c.dataset.themeKey === key;
          c.classList.toggle('is-selected', sel);
          const swatch = c.querySelector('.wizard-theme-swatch');
          if (swatch) {
            const ct = themes.find(t => t.key === c.dataset.themeKey);
            swatch.style.borderColor = sel ? (_themeColors(ct?.data).primary || 'transparent') : 'transparent';
          }
        });
        _updateWizardPreview();
      });
      container.appendChild(card);
    });
    _updateWizardPreview();
  });
}

function _wizardGoToStep(step) {
  _wizardStep = step;

  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`wizardStep${i}`);
    if (el) el.classList.toggle('is-active', i === step);
  }

  const progressEl = document.getElementById('wizardProgress');
  const footerEl   = document.getElementById('wizardFooter');
  if (progressEl) progressEl.style.display = step === 5 ? 'none' : '';
  if (footerEl)   footerEl.style.display   = step === 5 ? 'none' : '';

  if (step === 5) {
    const closeBtn = document.getElementById('wzCloseBtn');
    if (closeBtn) closeBtn.onclick = () => document.getElementById('wizardOverlay').classList.remove('is-active');
    return;
  }

  document.querySelectorAll('.wizard-dot').forEach(dot => {
    dot.classList.toggle('is-active', Number(dot.dataset.step) <= Math.min(step, 4));
  });

  const backBtn = document.getElementById('wizardBtnBack');
  const nextBtn = document.getElementById('wizardBtnNext');
  if (backBtn) backBtn.style.display = step > 1 ? '' : 'none';
  if (nextBtn) nextBtn.textContent   = step === 4 ? 'Salvar e publicar' : 'Próximo';

  if (step === 4) _updateWizardPreview();
}

async function wizardNext() {
  if (_wizardStep === 1) {
    const displayInput = document.getElementById('wzDisplayName');
    if (!displayInput?.value.trim()) {
      displayInput?.focus();
      return;
    }
  }

  if (_wizardStep === 3) {
    const slugInput = document.getElementById('wzSlug');
    const hasCustomUrl = Boolean(slugInput?.value.trim());

    if (hasCustomUrl) {
      const isSlugValid = await _validateWizardSlugAvailability({ immediate: true });
      if (!isSlugValid) {
        slugInput?.focus();
        return;
      }
    }
  }

  if (_wizardStep < 4) {
    _wizardGoToStep(_wizardStep + 1);
  } else {
    _saveWizard();
  }
}

function wizardBack() {
  if (_wizardStep > 1 && _wizardStep < 5) _wizardGoToStep(_wizardStep - 1);
}

function _wizardDeriveDateLabels(dateOnly) {
  const MS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const MF = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const WD = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const p  = new Date(`${dateOnly}T12:00:00`);
  if (isNaN(p.getTime())) return {};
  const d  = String(p.getDate()).padStart(2, '0');
  const mi = p.getMonth();
  const mn = String(mi + 1).padStart(2, '0');
  const yr = p.getFullYear();
  return {
    heroDate:    `${d} . ${mn} . ${yr}`,
    detailDate:  `${d} ${MS[mi]} ${yr}`,
    displayDate: `${d} de ${MF[mi]} de ${yr}`,
    weekday:     WD[p.getDay()],
  };
}

async function maybeShowWizard(config) {
  if (!config || !isFirstTimeUser(config)) return;

  await ensureUserProfileLoaded();

  // Pré-carregar temas em background
  _loadWizardThemes();

  // Pré-preencher nome de exibição existente
  const existingNames = config?.couple?.names || '';
  if (existingNames && existingNames !== 'Novo Casal') {
    const disp = document.getElementById('wzDisplayName');
    if (disp) disp.value = existingNames;
  }

  _wizardSelectedTheme = extractDashboardThemeKey(config.activeTheme || 'classic-gold') || 'classic-gold';
  if (!WIZARD_THEME_KEYS.includes(_wizardSelectedTheme)) {
    _wizardSelectedTheme = 'classic-gold';
  }
  _populateWizardTimeOptions(config?.event?.time || '17:00');

  const dateInput = document.getElementById('wzDate');
  if (dateInput && config?.event?.date) {
    const normalizedDate = String(config.event.date).split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      dateInput.value = normalizedDate;
    }
  }

  const slugInput = document.getElementById('wzSlug');
  if (slugInput) {
    _setWizardSlugFieldAvailability();

    const initialSlug = _normalizeWizardSlug(state.eventSlug || config?.rsvp?.eventId || '');
    slugInput.value = initialSlug;
    if (initialSlug) {
      _setWizardSlugStatus('idle', 'Verificando disponibilidade da URL...');
      _validateWizardSlugAvailability({ immediate: true });
    }

    slugInput.addEventListener('input', () => {
      _setWizardSlugStatus('loading', 'Verificando disponibilidade...');
      _validateWizardSlugAvailability();
    });
    slugInput.addEventListener('blur', () => {
      _validateWizardSlugAvailability({ immediate: true });
    });
  }

  _updateWizardSlugExampleText();

  // Binds do campo principal
  document.getElementById('wzDisplayName')?.addEventListener('input', function () {
    this.dataset.userEdited = '1';
    _updateWizardPreview();
    _updateWizardSlugExampleText();
  });
  document.getElementById('wzDate')?.addEventListener('change', () => {
    _updateWizardPreview();
    _updateWizardSlugExampleText();
  });

  // Clique nos exemplos
  document.querySelectorAll('.wizard-name-ex').forEach(btn => {
    btn.addEventListener('click', () => {
      const displayInput = document.getElementById('wzDisplayName');
      if (displayInput) {
        const separator = btn.dataset.sep || ' & ';
        const currentValue = displayInput.value.trim();
        
        if (currentValue) {
          const { first, second } = _parseDisplayNameParts(currentValue);
          if (first && second) {
            displayInput.value = `${first}${separator}${second}`;
          }
        }
        
        displayInput.dataset.userEdited = '1';
        _updateWizardPreview();
      }
    });
  });

  renderWizardThemes();
  _wizardGoToStep(1);

  document.getElementById('wizardOverlay').classList.add('is-active');
  document.getElementById('wizardBtnNext').onclick = wizardNext;
  document.getElementById('wizardBtnBack').onclick = wizardBack;
}

async function _saveWizard() {
  const nextBtn = document.getElementById('wizardBtnNext');
  const backBtn = document.getElementById('wizardBtnBack');
  if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Salvando…'; }
  if (backBtn) backBtn.disabled = true;

  const displayName  = document.getElementById('wzDisplayName')?.value.trim()  || '';
  const dateVal      = document.getElementById('wzDate')?.value                || '';
  const timeVal      = document.getElementById('wzTime')?.value                || '17:00';
  const venueName    = document.getElementById('wzVenueName')?.value.trim()    || '';
  const venueAddress = document.getElementById('wzVenueAddress')?.value.trim() || '';
  const slugValue    = _normalizeWizardSlug(document.getElementById('wzSlug')?.value || '');
  const canCustomizeUrl = true;
  const useAutoGeneratedUrl = !slugValue;

  if (canCustomizeUrl && !useAutoGeneratedUrl && _wizardSlugState !== 'valid') {
    const isValid = await _validateWizardSlugAvailability({ immediate: true });
    if (!isValid) {
      if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'Salvar e publicar'; }
      if (backBtn) backBtn.disabled = false;
      document.getElementById('wzSlug')?.focus();
      return;
    }
  }

  const dateLabels = dateVal ? _wizardDeriveDateLabels(dateVal) : {};

  const configPatch = {
    activeTheme:  resolveDashboardThemePath(_wizardSelectedTheme, 'classic'),
    activeLayout: 'classic',
    couple: {
      names: displayName,
    },
    event: {
      ...(dateVal && {
        date:    `${dateVal}T${timeVal}:00-03:00`,
        time:    timeVal,
        ...dateLabels,
      }),
      locationName: venueName   || 'A definir',
      venueAddress: venueAddress || 'A definir',
    },
  };

  if (canCustomizeUrl && slugValue) {
    configPatch.rsvp = {
      eventId: slugValue,
    };
  }

  const payload = {
    config: configPatch,
    autoGenerateSlug: useAutoGeneratedUrl,
  };

  if (state.eventId) {
    payload.eventId = state.eventId;
  }

  if (canCustomizeUrl && !useAutoGeneratedUrl) {
    payload.slug = slugValue;
  }

  try {
    const res  = await fetchWithAuth('/api/dashboard/event', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha ao salvar');

    if (data?.event?.id) {
      state.eventId = data.event.id;
    }
    syncPreviewInviteLink(data?.event?.slug || slugValue);

    if (data.config) {
      window.__SITE_CONFIG__ = data.config;
      applySiteConfig(data.config);
    }

    await loadAllData();
    _wizardGoToStep(5);

  } catch (err) {
    console.error('[wizard] Erro ao salvar:', err);
    if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'Salvar e publicar'; }
    if (backBtn) backBtn.disabled = false;
  }
}
