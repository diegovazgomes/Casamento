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
  currentPage: 1,
  editingGrupoId: null,
};

const TAB_LABELS = {
  overview: { tag: 'Visão Geral', title: 'Bem-vindos ao painel' },
  grupos: { tag: 'Grupos', title: 'Gestão de convidados' },
  confirmacoes: { tag: 'Confirmações', title: 'Respostas recebidas' },
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
    loadAllData();
  });
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
  dashboardScreen.style.display = 'block';
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

  // Carregar dados específicos se necessário
  if (tabName === 'confirmacoes') {
    reloadConfirmacoes();
  } else if (tabName === 'relatorios') {
    loadRelatorios();
  }
}

function syncActiveTab() {
  const activeTab = document.querySelector('.nav-item.is-active')?.dataset.tab || 'overview';
  updateTopbar(activeTab);
}

function updateTopbar(tabName) {
  const cfg = TAB_LABELS[tabName];
  if (!cfg) return;

  const topbarTag = document.getElementById('topbarTag');
  const topbarTitle = document.getElementById('topbarTitle');

  if (topbarTag) topbarTag.textContent = cfg.tag;
  if (topbarTitle) topbarTitle.textContent = cfg.title;
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
    body.innerHTML = state.grupos.map(grupo => `
      <tr>
        <td>
          <div class="cell-name">${escapeHtml(grupo.group_name)}</div>
          <div class="cell-sub">Criado para compartilhar um único link</div>
        </td>
        <td><span class="cell-token">${escapeHtml(grupo.token.substring(0, 8))}...</span></td>
        <td>
          <span class="cell-count">${grupo.confirmationCount}</span>
          <span class="cell-count-sep">/</span>
          <span class="cell-count">${grupo.max_confirmations}</span>
          <div class="cell-sub">${Math.max(grupo.slotsAvailable, 0)} vaga(s) restante(s)</div>
        </td>
        <td>${maskPhone(grupo.phone)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" onclick="editGrupo('${grupo.id}')" aria-label="Editar grupo ${escapeHtml(grupo.group_name)}" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </button>
            <button class="icon-btn" onclick="sendLembrete('${grupo.id}', '${escapeHtmlAttribute(grupo.group_name)}')" aria-label="Enviar lembrete para ${escapeHtml(grupo.group_name)}" title="Lembrete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9 22 2z"/></svg>
            </button>
            <button class="icon-btn danger" onclick="deleteGrupo('${grupo.id}')" aria-label="Excluir grupo ${escapeHtml(grupo.group_name)}" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

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

  try {
    let url = `/api/dashboard/confirmations?eventId=${state.eventId}&page=${page}`;
    if (status) url += `&status=${status}`;
    if (groupId) url += `&groupId=${groupId}`;

    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    const rawConfirmacoes = data.data || [];
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
        <td>${maskPhone(conf.phone)}</td>
        <td>${escapeHtml(conf.groupName)}</td>
        <td>
          ${renderStatusBadge(conf.status)}
        </td>
        <td>${new Date(conf.confirmedAt).toLocaleDateString('pt-BR')}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" onclick="sendLembrete('${conf.groupId}', '${escapeHtmlAttribute(conf.groupName)}')" aria-label="Enviar lembrete para ${escapeHtml(conf.groupName)}" title="Lembrete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9 22 2z"/></svg>
            </button>
          </div>
        </td>
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
// RELATÓRIOS
// ============================================================

async function loadRelatorios() {
  try {
    const response = await fetchWithAuth(`/api/dashboard/confirmations?eventId=${state.eventId}&pageSize=1000`);
    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    const confirmacoes = data.data || [];

    // Calcular estatísticas
    const total = confirmacoes.length;
    const confirmados = confirmacoes.filter(c => c.status === 'yes').length;
    const recusados = confirmacoes.filter(c => c.status === 'no').length;
    const pendentes = total - confirmados - recusados;

    updateOverviewStats(total, confirmados, recusados, pendentes);

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

function maskPhone(phone) {
  if (!phone) return 'N/A';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return digits.slice(0, -4).replace(/./g, '*') + digits.slice(-4);
}

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
  const confirmados = state.confirmacoes.filter((conf) => conf.status === 'yes').length;
  const recusados = state.confirmacoes.filter((conf) => conf.status === 'no').length;
  const pendentes = Math.max(totalConvidados - confirmados - recusados, 0);

  updateOverviewStats(totalConvidados, confirmados, recusados, pendentes);

  const recentActivityBody = document.getElementById('recentActivityBody');
  if (!recentActivityBody) return;

  if (state.confirmacoes.length === 0) {
    recentActivityBody.innerHTML = '<tr><td colspan="4"><div class="empty"><div class="empty-title">Sem atividade recente</div><p class="empty-text">As confirmações mais recentes aparecerão aqui.</p></div></td></tr>';
    return;
  }

  recentActivityBody.innerHTML = state.confirmacoes.slice(0, 5).map((conf) => `
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
  await loadGrupos();
  await populateGrupoFilter();
  await reloadConfirmacoes();
  await loadRelatorios();
}
