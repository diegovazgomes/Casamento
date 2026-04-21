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

// DOM Elements
const authScreen = document.getElementById('authScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const authForm = document.getElementById('authForm');
const authError = document.getElementById('authError');
const logoutButton = document.getElementById('logoutButton');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Carregar token do sessionStorage
  const savedToken = sessionStorage.getItem('dashboardToken');
  if (savedToken) {
    state.authToken = savedToken;
    showDashboard();
    loadAllData();
  } else {
    showAuthScreen();
  }

  // Event Listeners
  authForm.addEventListener('submit', handleAuth);
  logoutButton.addEventListener('click', handleLogout);
  
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', handleTabSwitch);
  });

  // Modais
  document.getElementById('btnNewGroup').addEventListener('click', () => openModal('modalGrupo', 'Novo Grupo'));
  document.getElementById('btnDownloadCsv').addEventListener('click', handleDownloadCsv);

  // Listeners dos modais
  setupModalListeners();
});

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
  authError.style.display = 'block';
}

function showAuthScreen() {
  authScreen.style.display = 'flex';
  dashboardScreen.style.display = 'none';
}

function showDashboard() {
  authScreen.style.display = 'none';
  dashboardScreen.style.display = 'block';
}

// ============================================================
// TABS
// ============================================================

function handleTabSwitch(event) {
  const tabName = event.target.dataset.tab;
  
  // Remover active de todos
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Adicionar active
  event.target.classList.add('active');
  document.getElementById(tabName).classList.add('active');

  // Carregar dados específicos se necessário
  if (tabName === 'confirmacoes') {
    reloadConfirmacoes();
  } else if (tabName === 'relatorios') {
    loadRelatorios();
  }
}

// ============================================================
// GRUPOS
// ============================================================

async function loadGrupos() {
  const container = document.getElementById('gruposContainer');
  const loading = document.getElementById('gruposLoading');
  const empty = document.getElementById('gruposEmpty');
  const body = document.getElementById('gruposBody');

  loading.style.display = 'block';
  container.style.display = 'none';
  empty.style.display = 'none';

  try {
    const response = await fetchWithAuth(`/api/dashboard/guest-groups?eventId=${state.eventId}`);
    if (!response.ok) throw new Error(response.statusText);
    
    const data = await response.json();
    state.grupos = data.data || [];

    if (state.grupos.length === 0) {
      empty.style.display = 'block';
      loading.style.display = 'none';
      return;
    }

    // Renderizar tabela
    body.innerHTML = state.grupos.map(grupo => `
      <tr>
        <td><strong>${escapeHtml(grupo.group_name)}</strong></td>
        <td><code style="background: #f5f5f5; padding: 0.25rem 0.5rem; border-radius: 3px;">${grupo.token.substring(0, 8)}...</code></td>
        <td>${grupo.confirmationCount} / ${grupo.max_confirmations}</td>
        <td>${grupo.slotsAvailable >= 0 ? grupo.slotsAvailable : '0'}</td>
        <td>${maskPhone(grupo.phone)}</td>
        <td class="actions">
          <button class="action-button" onclick="editGrupo('${grupo.id}')">Editar</button>
          <button class="action-button" onclick="sendLembrete('${grupo.id}', '${escapeHtml(grupo.group_name)}')">Lembrete</button>
          <button class="action-button danger" onclick="deleteGrupo('${grupo.id}')">Deletar</button>
        </td>
      </tr>
    `).join('');

    loading.style.display = 'none';
    container.style.display = 'block';
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

  await loadConfirmacoes(1, status, groupId);
  await populateGrupoFilter();
}

async function loadConfirmacoes(page = 1, status = '', groupId = '') {
  const container = document.getElementById('confirmacoesContainer');
  const loading = document.getElementById('confirmacoesLoading');
  const empty = document.getElementById('confirmacoesEmpty');
  const body = document.getElementById('confirmacoesBody');

  loading.style.display = 'block';
  container.style.display = 'none';
  empty.style.display = 'none';

  try {
    let url = `/api/dashboard/confirmations?eventId=${state.eventId}&page=${page}`;
    if (status) url += `&status=${status}`;
    if (groupId) url += `&groupId=${groupId}`;

    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    state.confirmacoes = data.data || [];

    if (state.confirmacoes.length === 0) {
      empty.style.display = 'block';
      loading.style.display = 'none';
      return;
    }

    // Renderizar tabela
    body.innerHTML = state.confirmacoes.map(conf => `
      <tr>
        <td><strong>${escapeHtml(conf.name)}</strong></td>
        <td>${maskPhone(conf.phone)}</td>
        <td>${escapeHtml(conf.groupName)}</td>
        <td>
          ${conf.status === 'yes' ? '✅ Confirmado' : conf.status === 'no' ? '❌ Recusado' : '⏳ Pendente'}
        </td>
        <td>${new Date(conf.confirmedAt).toLocaleDateString('pt-BR')}</td>
        <td class="actions">
          <button class="action-button" onclick="sendLembrete('${conf.groupId}', '${escapeHtml(conf.groupName)}')">Lembrete</button>
        </td>
      </tr>
    `).join('');

    // Paginação
    renderPaginacao(data.pagination, page, status, groupId);

    loading.style.display = 'none';
    container.style.display = 'block';
  } catch (error) {
    console.error('[loadConfirmacoes]', error);
    loading.innerHTML = '<p style="color: #c33;">Erro ao carregar confirmações</p>';
  }
}

function renderPaginacao(pagination, currentPage, status, groupId) {
  const paginacao = document.getElementById('paginacao');
  
  if (pagination.totalPages <= 1) {
    paginacao.innerHTML = '';
    return;
  }

  let html = '<div style="display: flex; gap: 0.5rem; justify-content: center;">';
  
  if (currentPage > 1) {
    html += `<button class="action-button" onclick="loadConfirmacoes(${currentPage - 1}, '${status}', '${groupId}')">← Anterior</button>`;
  }

  html += `<span style="padding: 0.5rem 1rem; background: #f5f5f5; border-radius: 4px;">
    Página ${currentPage} de ${pagination.totalPages}
  </span>`;

  if (currentPage < pagination.totalPages) {
    html += `<button class="action-button" onclick="loadConfirmacoes(${currentPage + 1}, '${status}', '${groupId}')">Próxima →</button>`;
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

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statConfirmados').textContent = confirmados;
    document.getElementById('statRecusados').textContent = recusados;
    document.getElementById('statPendentes').textContent = pendentes;

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
  const templates = {
    pending: 'Olá! Ainda não recebemos sua confirmação para o casamento de Siannah & Diego. Por favor, confirme sua presença através do link que recebeu.',
    thankyou: 'Obrigado por confirmar sua presença no casamento de Siannah & Diego! Fique atento para mais informações nos próximos dias.',
    announcement: 'Oi! Temos uma informação importante sobre o casamento de Siannah & Diego. Verifique seu email ou o convite online.',
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

function openModal(modalId, title = null) {
  document.getElementById(modalId).classList.add('active');
  if (title && modalId === 'modalGrupo') {
    document.getElementById('modalGrupoTitle').textContent = title;
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  if (modalId === 'modalGrupo') {
    state.editingGrupoId = null;
    document.getElementById('formGrupo').reset();
  }
}

function setupModalListeners() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
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
}
