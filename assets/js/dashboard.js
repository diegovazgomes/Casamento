/**
 * dashboard.js
 * Lógica e interação do painel de gerenciamento do casal
 */

// Estado
const state = {
  authToken: null,
  eventId: '',
  eventSlug: new URLSearchParams(window.location.search).get('slug') || null,
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
        showDashboard();
        await hydrateDashboardEventContext();
        await loadAllData();
      } catch (error) {
        console.error('[dashboard] Falha ao hidratar evento com token salvo.', error);
        await clearDashboardSession();
        showAuthScreen();
        showAuthError(error?.message || 'Não foi possível conectar ao evento no Supabase.');
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
    showAuthError(error?.message || 'Não foi possível inicializar a autenticação do dashboard.');
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
    state.eventSlug = data.event.slug;
    const previewBtn = document.getElementById('btnPreviewInvite');
    if (previewBtn) previewBtn.href = window.location.origin;
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

  try {
    authError.style.display = 'none';
    const supabase = await getDashboardSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session?.access_token) {
      showAuthError(error?.message || 'Erro na autenticação');
      return;
    }

    state.authToken = data.session.access_token;
    sessionStorage.setItem(DASHBOARD_ACCESS_TOKEN_STORAGE_KEY, state.authToken);

    // Limpar form
    authForm.reset();

    try {
      await hydrateDashboardEventContext();
      await loadAllData();
    } catch (hydrateError) {
      console.error('[auth] Falha ao hidratar dashboard após login', hydrateError);
      await clearDashboardSession();
      showAuthScreen();
      showAuthError(hydrateError?.message || 'Não foi possível carregar os dados do evento.');
      notifyDashboardReady();
      return;
    }

    // Mostrar dashboard
    showDashboard();

    // Exibir nome do casal vindo do profile (não-bloqueante)
    fetchUserProfile().then(profile => {
      if (profile?.couple_name) {
        const sidebarCouple = document.getElementById('sidebarCouple');
        if (sidebarCouple) sidebarCouple.textContent = profile.couple_name;
      }
    }).catch(() => {});

    notifyDashboardReady();
  } catch (error) {
    console.error('[auth]', error);
    showAuthError(error?.message || 'Erro ao conectar ao servidor');
    notifyDashboardReady();
  }
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
      if (!window.supabase?.createClient) {
        throw new Error('SDK do Supabase não carregado no dashboard');
      }

      const response = await fetch('/api/config');
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
          detectSessionInUrl: true,
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
  const token = state.authToken;
  if (!token) return null;

  try {
    const response = await fetch('/api/dashboard/profile', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
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
            <button class="icon-btn"${phoneDisabledAttr}${phoneDisabledClass} onclick="${hasPhone ? `openWhatsApp('${escapeHtmlAttribute(grupo.phone)}')` : ''}" aria-label="Abrir WhatsApp de ${escapeHtml(grupo.group_name)}" title="${hasPhone ? 'Abrir WhatsApp' : 'Telefone não cadastrado'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span class="icon-btn-label">WhatsApp</span>
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

function sendInviteWhatsApp(grupoId) {
  const grupo = state.grupos.find(g => g.id === grupoId);
  if (!grupo || !grupo.phone) return;

  const coupleNames = window.__SITE_CONFIG__?.couple?.names || 'os noivos';
  const link = `${window.location.origin}/index.html?g=${grupo.token}`;
  const vagas = grupo.max_confirmations;
  const vagasTexto = vagas === 1 ? '1 pessoa' : `${vagas} pessoas`;

  const mensagem =
    `Olá! Você está sendo convidado(a) para o casamento de ${coupleNames}! 🎊\n\n` +
    `Seu convite é para ${vagasTexto}. Acesse o link abaixo para confirmar sua presença e compartilhe com os demais convidados do seu grupo:\n\n` +
    `${link}\n\n` +
    `Aguardamos você com muito carinho! 🤍`;

  const digits = grupo.phone.replace(/\D/g, '');
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openWhatsApp(phone) {
  if (!phone) return;
  const digits = phone.replace(/\D/g, '');
  window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer');
}

// ============================================================
// COPIAR LINK DE CONVITE
// ============================================================

async function copyInviteLink(token) {
  const link = `${window.location.origin}/index.html?g=${token}`;
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

function showCopyFeedback(token) {
  const btn = document.querySelector(`[data-copy-token="${CSS.escape(token)}"]`);
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
  originalConfig: null,
};

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

  // Casal & Evento
  setVal('edCoupleNames',       config.couple?.names      ?? '');
  setVal('edCoupleSubtitle',    config.couple?.subtitle || window.__SITE_JSON__?.couple?.subtitle || '');
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
  setPixQrUploadStatus('');

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

  // Fotos & Mídia
  setVal('edMediaHero',       config.media?.heroImage             ?? '');
  setVal('edTrackMainSrc',    config.media?.tracks?.main?.src     ?? '');
  setVal('edTrackMainVolume', config.media?.tracks?.main?.volume  ?? '');
  setVal('edTrackMainStart',  config.media?.tracks?.main?.startTime ?? '');
  setVal('edTrackGiftSrc',    config.media?.tracks?.gift?.src     ?? '');
  setVal('edTrackGiftVolume', config.media?.tracks?.gift?.volume  ?? '');
  setVal('edTrackGiftStart',  config.media?.tracks?.gift?.startTime ?? '');
  renderMediaHeroPreview(config.media?.heroImage || '');
  renderMediaGalleryGrid(config.pages?.historia?.content?.gallery || []);
  setMediaUploadStatus('');

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

function markEditorDirty() {
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

function setMediaUploadStatus(message, isError = false) {
  const statusEl = document.getElementById('edMediaUploadStatus');
  if (!statusEl) return;

  statusEl.textContent = message || '';
  statusEl.style.color = isError ? 'var(--danger)' : 'var(--text-dim)';
}

function setPixQrUploadStatus(message, isError = false) {
  const statusEl = document.getElementById('edGiftPixQrUploadStatus');
  if (!statusEl) return;

  statusEl.textContent = message || '';
  statusEl.style.color = isError ? 'var(--danger)' : 'var(--text-dim)';
}

async function uploadMediaFile(type, file) {
  if (!state.eventId) {
    throw new Error('Evento não carregado no dashboard. Recarregue a página.');
  }

  // Força token fresco diretamente do cliente Supabase para evitar token expirado
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

  const formData = new FormData();
  formData.append('eventId', state.eventId);
  formData.append('type', type);
  formData.append('file', file);

  const response = await fetch('/api/dashboard/media', {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${state.authToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Falha ao enviar mídia');
  }

  return data;
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

function renderMediaGalleryGrid(images) {
  const grid = document.getElementById('edMediaGalleryGrid');
  const emptyEl = document.getElementById('edMediaGalleryEmpty');

  if (!grid || !emptyEl) {
    return;
  }

  if (!Array.isArray(images) || images.length === 0) {
    grid.innerHTML = '';
    emptyEl.style.display = '';
    return;
  }

  emptyEl.style.display = 'none';
  grid.innerHTML = images.map((image, index) => {
    const src = escapeHtml(image?.src || '');
    const alt = escapeHtml(image?.alt || `Foto ${index + 1}`);
    return `<div class="media-gallery-card"><img src="${src}" alt="${alt}" onerror="this.style.opacity=0.3"></div>`;
  }).join('');
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
    setPixQrUploadStatus('Selecione uma imagem para o QR Pix.', true);
    return;
  }

  setPixQrUploadStatus('Enviando QR Pix...');
  if (button) {
    button.disabled = true;
  }

  try {
    const result = await uploadMediaFile('pix-qr', file);
    setVal('edGiftPixQr', result.url || '');

    if (window.__SITE_CONFIG__) {
      if (!window.__SITE_CONFIG__.gift) window.__SITE_CONFIG__.gift = {};
      window.__SITE_CONFIG__.gift.pixQrImage = result.url || '';
    }

    renderPixQrPreview(result.url || '');
    markEditorDirty();
    setPixQrUploadStatus('QR Pix enviado. Lembre-se de salvar as alterações.');

    if (input) {
      input.value = '';
    }
  } catch (error) {
    console.error('[uploadPixQrMedia]', error);
    setPixQrUploadStatus(error.message || 'Erro ao enviar QR Pix.', true);
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
    setMediaUploadStatus('Selecione uma imagem para a foto principal.', true);
    return;
  }

  setMediaUploadStatus('Enviando foto principal...');
  if (button) {
    button.disabled = true;
  }

  try {
    const result = await uploadMediaFile('hero', file);
    setVal('edMediaHero', result.url || '');

    if (window.__SITE_CONFIG__) {
      if (!window.__SITE_CONFIG__.media) window.__SITE_CONFIG__.media = {};
      window.__SITE_CONFIG__.media.heroImage = result.url || '';
    }

    renderMediaHeroPreview(result.url || '');

    markEditorDirty();
    setMediaUploadStatus('Foto principal enviada. Lembre-se de salvar as alterações.');

    if (input) {
      input.value = '';
    }
  } catch (error) {
    console.error('[uploadHeroMedia]', error);
    setMediaUploadStatus(error.message || 'Erro ao enviar foto principal.', true);
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
    setMediaUploadStatus('Selecione ao menos uma imagem para a galeria.', true);
    return;
  }

  setMediaUploadStatus(`Enviando ${files.length} imagem(ns) para a galeria...`);
  if (button) {
    button.disabled = true;
  }

  try {
    const uploadedItems = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setMediaUploadStatus(`Enviando ${index + 1}/${files.length}: ${file.name}...`);
      const result = await uploadMediaFile('gallery', file);
      uploadedItems.push({
        src: result.url || '',
        alt: file.name.replace(/\.[^.]+$/, ''),
      });
    }

    if (window.__SITE_CONFIG__) {
      const gallery = ensureHistoriaGalleryArray(window.__SITE_CONFIG__);
      uploadedItems.forEach((item) => {
        if (item.src) {
          gallery.push(item);
        }
      });

      renderMediaGalleryGrid(gallery);
    }

    markEditorDirty();
    setMediaUploadStatus(`Galeria atualizada com ${uploadedItems.length} nova(s) imagem(ns). Salve para persistir.`);

    if (input) {
      input.value = '';
    }
  } catch (error) {
    console.error('[uploadGalleryMedia]', error);
    setMediaUploadStatus(error.message || 'Erro ao enviar imagens da galeria.', true);
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
  select.innerHTML = themes.map(t => {
    const path = `assets/layouts/${layout}/themes/${t.key}.json`;
    const sel  = currentPath === path ? ' selected' : '';
    return `<option value="${escapeHtml(path)}"${sel}>${escapeHtml(t.label)}</option>`;
  }).join('');
}

function onLayoutChange() {
  const layout = document.getElementById('edActiveLayout')?.value || 'classic';
  populateThemeSelect(layout, '');
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
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:14px">
        <span class="page-card-name">${escapeHtml(PAGE_LABELS[key] || key)}</span>
        <label class="toggle" style="flex-shrink:0" onclick="event.stopPropagation()">
          <input type="checkbox" class="toggle-input" id="edPage_${key}_enabled"
                 ${enabled ? 'checked' : ''} onchange="markEditorDirty()">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
      </div>
      <div class="form-group" style="margin-bottom:10px">
        <div class="field">
          <label class="field-label" for="edPage_${key}_label">Label do card</label>
          <input type="text" class="field-input sm" id="edPage_${key}_label"
                 value="${escapeHtml(page.cardLabel || '')}"
                 placeholder="ex: Nossa história" oninput="markEditorDirty()">
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="edPage_${key}_hint">Descrição do card</label>
        <input type="text" class="field-input sm" id="edPage_${key}_hint"
               value="${escapeHtml(page.cardHint || '')}"
               placeholder="Frase de convite" oninput="markEditorDirty()">
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
  config.activeTheme  = document.getElementById('edActiveTheme')?.value  || config.activeTheme;

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
  config.media.tracks.main.src       = document.getElementById('edTrackMainSrc')?.value.trim()    || '';
  config.media.tracks.main.volume    = parseFloat(document.getElementById('edTrackMainVolume')?.value)  || 0.14;
  config.media.tracks.main.startTime = parseInt(document.getElementById('edTrackMainStart')?.value)     || 0;
  config.media.tracks.gift.src       = document.getElementById('edTrackGiftSrc')?.value.trim()    || '';
  config.media.tracks.gift.volume    = parseFloat(document.getElementById('edTrackGiftVolume')?.value)  || 0.12;
  config.media.tracks.gift.startTime = parseInt(document.getElementById('edTrackGiftStart')?.value)     || 0;

  // Páginas extras
  if (!config.pages) config.pages = {};
  ['historia', 'faq', 'hospedagem', 'mensagem', 'musica', 'presente'].forEach(key => {
    if (!config.pages[key]) config.pages[key] = {};
    config.pages[key].enabled   = document.getElementById(`edPage_${key}_enabled`)?.checked ?? false;
    config.pages[key].cardLabel = document.getElementById(`edPage_${key}_label`)?.value.trim() || '';
    config.pages[key].cardHint  = document.getElementById(`edPage_${key}_hint`)?.value.trim()  || '';
  });

  // Capítulos de Nossa História
  if (!config.pages.historia) config.pages.historia = {};
  if (!config.pages.historia.content) config.pages.historia.content = {};
  config.pages.historia.content.chapters = [0, 1, 2].map(i => ({
    year:  document.getElementById(`edChapter${i}Year`)?.value.trim()  || '',
    title: document.getElementById(`edChapter${i}Title`)?.value.trim() || '',
    text:  document.getElementById(`edChapter${i}Text`)?.value.trim()  || '',
  }));

  // Imagens da galeria não têm campo de formulário — vivem em window.__SITE_CONFIG__
  // (modificado pelos uploads). Preserva o estado vivo para não descartar ao salvar.
  const liveGallery = window.__SITE_CONFIG__?.pages?.historia?.content?.gallery;
  if (Array.isArray(liveGallery)) {
    config.pages.historia.content.gallery = liveGallery;
  }

  return config;
}

async function saveEditorConfig() {
  const config = collectEditorValues();

  if (!state.eventId) {
    updateEditorSaveStatus('Evento não carregado — recarregue o dashboard');
    return;
  }

  try {
    const response = await fetchWithAuth('/api/dashboard/event', {
      method: 'PATCH',
      body: JSON.stringify({ eventId: state.eventId, config }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      updateEditorSaveStatus(data.error || 'Erro ao salvar no servidor');
      return;
    }

    const savedConfig = data?.config && typeof data.config === 'object' ? data.config : config;
    window.__SITE_CONFIG__ = savedConfig;
    editorState.isDirty = false;
    editorState.originalConfig = JSON.parse(JSON.stringify(savedConfig));
    applySiteConfig(savedConfig);
    updateEditorSaveStatus('As informações do seu convite foram salvas ✓');
  } catch (error) {
    console.error('[saveEditorConfig]', error);
    updateEditorSaveStatus('Erro ao salvar no servidor');
  }
}
