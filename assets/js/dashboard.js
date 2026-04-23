/**
 * dashboard.js
 * Lógica e interação do painel de gerenciamento do casal
 */

// Estado
const state = {
  authToken: null,
  eventId: 'siannah-diego-2026', // Padrão — pode ser lido de config futuramente
  grupos: [],
  confirmacoes: [],
  allConfirmacoes: [],
  mensagens: [],
  musicas: [],
  currentPage: 1,
  editingGrupoId: null,
};

const TAB_LABELS = {
  overview: { tag: 'Visão Geral', title: 'Bem-vindos ao painel' },
  grupos: { tag: 'Grupos', title: 'Gestão de convidados' },
  confirmacoes: { tag: 'Confirmações', title: 'Respostas recebidas' },
  mensagens: { tag: 'Mensagens', title: 'Recados dos convidados' },
  musicas: { tag: 'Músicas', title: 'Sugestões recebidas' },
  relatorios: { tag: 'Relatórios', title: 'Estatísticas por grupo' },
  export: { tag: 'Exportação', title: 'Baixar seus dados' },
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
  syncActiveTab();
});

async function initializeDashboard() {
  const bootstrapPromise = window.__DASHBOARD_BOOTSTRAP_PROMISE__;
  if (bootstrapPromise && typeof bootstrapPromise.then === 'function') {
    try {
      const bootstrap = await bootstrapPromise;
      applySiteConfig(bootstrap?.config);
    } catch (error) {
      console.warn('[dashboard] Falha ao aguardar bootstrap de config.', error);
    }
  }

  // Carregar token do sessionStorage
  const savedToken = sessionStorage.getItem('dashboardToken');
  if (savedToken) {
    state.authToken = savedToken;
    showDashboard();
    await loadAllData();
    return;
  }

  showAuthScreen();
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
  document.getElementById('btnNewGroup').addEventListener('click', () => openModal('modalGrupo', 'Novo Grupo'));
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

  const eventId = siteConfig?.rsvp?.eventId;
  if (eventId) {
    state.eventId = eventId;
  }

  const coupleNames = siteConfig?.couple?.names;
  const heroDate = siteConfig?.event?.heroDate || siteConfig?.event?.displayDate || '';

  const sidebarCouple = document.getElementById('sidebarCouple');
  const sidebarDate = document.getElementById('sidebarDate');
  const authCoupleTitle = document.getElementById('authCoupleTitle');

  if (sidebarCouple && coupleNames) sidebarCouple.textContent = coupleNames;
  if (sidebarDate && heroDate) sidebarDate.textContent = heroDate;
  if (authCoupleTitle && coupleNames) authCoupleTitle.textContent = coupleNames;
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

async function handleAuth(event) {
  event.preventDefault();
  
  const password = document.getElementById('password').value.trim();
  if (!password) return;

  try {
    authError.style.display = 'none';
    const response = await fetch('/api/dashboard/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showAuthError(data.error || 'Erro na autenticação');
      return;
    }

    // Salvar token
    state.authToken = data.token;
    sessionStorage.setItem('dashboardToken', data.token);

    // Limpar form
    authForm.reset();

    // Mostrar dashboard
    showDashboard();
    loadAllData();
  } catch (error) {
    console.error('[auth]', error);
    showAuthError('Erro ao conectar ao servidor');
  }
}

function handleLogout() {
  sessionStorage.removeItem('dashboardToken');
  state.authToken = null;
  state.grupos = [];
  state.confirmacoes = [];
  state.allConfirmacoes = [];
  showAuthScreen();
  authForm.reset();
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
}

// ============================================================
// GRUPOS
// ============================================================

async function loadGrupos() {
  const container = document.getElementById('gruposTable');
  const loading = document.getElementById('gruposLoading');
  const empty = document.getElementById('gruposEmpty');
  const body = document.getElementById('gruposBody');

  loading.style.display = 'block';
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

  openModal('modalGrupo');
}

async function handleSaveGrupo(event) {
  event.preventDefault();

  const grupoName = document.getElementById('grupoName').value.trim();
  const grupoMaxConfirmations = parseInt(document.getElementById('grupoMaxConfirmations').value, 10);
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
      alert(`Grupo criado! Link: ${data.data.inviteLink}`);
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

  loading.style.display = 'block';
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
  body.innerHTML = data.data.map((item) => `
    <tr>
      <td><div class="cell-name">${escapeHtml(item.guestName || 'Anônimo')}</div></td>
      <td><span class="cell-sub">${escapeHtml(item.message || '—')}</span></td>
      <td>${escapeHtml(formatSubmissionSource(item.source))}</td>
      <td>${new Date(item.submittedAt).toLocaleDateString('pt-BR')}</td>
    </tr>
  `).join('');

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

  loading.style.display = 'block';
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

function formatSubmissionSource(source) {
  if (source === 'mensagem-page') return 'Página Mensagem';
  if (source === 'musica-page') return 'Página Música';
  return source || 'Site';
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
  const coupleNames = window.__SITE_CONFIG__?.couple?.names || 'Siannah & Diego';
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
    document.getElementById('formGrupo').reset();
  }
}

function setupModalListeners() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('is-active');
      }
    });
  });
}

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.authToken}`,
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
}

// ============================================================
// CARREGAMENTO INICIAL
// ============================================================

async function loadAllData() {
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
