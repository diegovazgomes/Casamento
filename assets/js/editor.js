/**
 * editor.js
 * Family-friendly content editor for site.json.
 * Works entirely in-browser: import JSON → edit → export JSON.
 * No build step, no server required.
 */

// ── State ─────────────────────────────────────────────────────────────────────

let config = null;
let isDirty = false;
let activeTab = 'casal';

// ── Path utilities ────────────────────────────────────────────────────────────

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Dirty state ───────────────────────────────────────────────────────────────

function markDirty() {
  if (isDirty) return;
  isDirty = true;
  document.getElementById('dirty-badge')?.classList.remove('hidden');
}

function markClean() {
  isDirty = false;
  document.getElementById('dirty-badge')?.classList.add('hidden');
}

// ── Import / Export ───────────────────────────────────────────────────────────

async function loadDefault() {
  try {
    const res = await fetch('assets/config/site.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    startEditor(await res.json());
  } catch (err) {
    alert('Não foi possível carregar o site.json automaticamente. Selecione o arquivo manualmente.');
    console.error('[editor] loadDefault:', err);
  }
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      startEditor(JSON.parse(ev.target.result));
    } catch {
      alert('Arquivo inválido. Selecione um site.json válido.');
    }
  };
  reader.readAsText(file);
  // Reset so the same file can be re-imported
  e.target.value = '';
}

function startEditor(parsed) {
  config = parsed;
  document.getElementById('import-screen').classList.add('hidden');
  document.getElementById('editor-screen').classList.remove('hidden');
  renderActiveTab();
  markClean();
}

function exportJson() {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'site.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  markClean();
}

// ── Field templates (return HTML strings) ─────────────────────────────────────

function fieldInput({ label, path, placeholder = '', hint = '' }) {
  const val = esc(getPath(config, path));
  return `
    <div class="ed-field">
      <label class="ed-label">
        ${esc(label)}
        ${hint ? `<span class="ed-hint">${esc(hint)}</span>` : ''}
      </label>
      <input class="ed-input" type="text" data-path="${path}"
        value="${val}" placeholder="${esc(placeholder)}">
    </div>`;
}

function fieldTextarea({ label, path, placeholder = '', hint = '', tall = false }) {
  const val = esc(getPath(config, path));
  return `
    <div class="ed-field">
      <label class="ed-label">
        ${esc(label)}
        ${hint ? `<span class="ed-hint">${esc(hint)}</span>` : ''}
      </label>
      <textarea class="ed-textarea${tall ? ' ed-textarea--tall' : ''}" data-path="${path}"
        placeholder="${esc(placeholder)}">${val}</textarea>
    </div>`;
}

function group(title, content) {
  return `
    <div class="ed-group">
      <h3 class="ed-group-title">${esc(title)}</h3>
      ${content}
    </div>`;
}

function listGroup({ title, addAction, listId, itemsHtml, emptyText }) {
  return `
    <div class="ed-group">
      <div class="ed-group-header">
        <h3 class="ed-group-title">${esc(title)}</h3>
        <button class="ed-btn-add" data-action="${addAction}">+ Adicionar</button>
      </div>
      <div id="${listId}" class="ed-list">
        ${itemsHtml || `<p class="ed-empty">${esc(emptyText)}</p>`}
      </div>
    </div>`;
}

// ── List item templates ────────────────────────────────────────────────────────

function faqItemHtml(item, i) {
  return `
    <div class="ed-list-item">
      <div class="ed-list-item-header">
        <span class="ed-list-num">Pergunta ${i + 1}</span>
        <button class="ed-btn-remove" data-action="remove-faq" data-index="${i}" title="Remover">Remover</button>
      </div>
      <div class="ed-field">
        <label class="ed-label">Pergunta</label>
        <input class="ed-input" type="text"
          data-list="faq" data-idx="${i}" data-key="question"
          value="${esc(item.question)}" placeholder="Ex: Qual é o dress code?">
      </div>
      <div class="ed-field">
        <label class="ed-label">Resposta</label>
        <textarea class="ed-textarea"
          data-list="faq" data-idx="${i}" data-key="answer"
          placeholder="Ex: Esporte fino.">${esc(item.answer)}</textarea>
      </div>
    </div>`;
}

function chapterHtml(ch, i) {
  return `
    <div class="ed-list-item">
      <div class="ed-list-item-header">
        <span class="ed-list-num">Capítulo ${i + 1}</span>
        <button class="ed-btn-remove" data-action="remove-historia" data-index="${i}" title="Remover">Remover</button>
      </div>
      <div class="ed-fields-row">
        <div class="ed-field ed-field--narrow">
          <label class="ed-label">Ano</label>
          <input class="ed-input" type="text"
            data-list="historia" data-idx="${i}" data-key="year"
            value="${esc(ch.year)}" placeholder="2026">
        </div>
        <div class="ed-field">
          <label class="ed-label">Título</label>
          <input class="ed-input" type="text"
            data-list="historia" data-idx="${i}" data-key="title"
            value="${esc(ch.title)}" placeholder="O grande dia">
        </div>
      </div>
      <div class="ed-field">
        <label class="ed-label">Texto</label>
        <textarea class="ed-textarea ed-textarea--tall"
          data-list="historia" data-idx="${i}" data-key="text"
          placeholder="Conte o que aconteceu nesse momento...">${esc(ch.text)}</textarea>
      </div>
    </div>`;
}

function hospItemHtml(item, i, listKey) {
  const isHotel = listKey === 'hotels';
  const label = isHotel ? 'Hotel' : 'Restaurante';
  const removeAction = `remove-${listKey}`;
  return `
    <div class="ed-list-item">
      <div class="ed-list-item-header">
        <span class="ed-list-num">${label} ${i + 1}</span>
        <button class="ed-btn-remove" data-action="${removeAction}" data-index="${i}">Remover</button>
      </div>
      <div class="ed-field">
        <label class="ed-label">Nome</label>
        <input class="ed-input" type="text"
          data-list="${listKey}" data-idx="${i}" data-key="name"
          value="${esc(item.name)}" placeholder="Nome do ${label.toLowerCase()}">
      </div>
      <div class="ed-field">
        <label class="ed-label">Descrição</label>
        <textarea class="ed-textarea"
          data-list="${listKey}" data-idx="${i}" data-key="description"
          placeholder="Breve descrição...">${esc(item.description)}</textarea>
      </div>
    </div>`;
}

// ── Section renderers ──────────────────────────────────────────────────────────

function renderCasal() {
  return group('Casal', `
    ${fieldInput({ label: 'Nomes do casal', path: 'couple.names', placeholder: 'Siannah & Diego' })}
    ${fieldTextarea({ label: 'Frase do casal', path: 'couple.subtitle', hint: 'Exibida abaixo dos nomes' })}
  `) + group('Data & Horário', `
    ${fieldInput({ label: 'Data (formato longo)', path: 'event.displayDate', placeholder: '06 de setembro de 2026', hint: 'Usada na seção de detalhes e meta' })}
    ${fieldInput({ label: 'Data (hero)', path: 'event.heroDate', placeholder: '06 . 09 . 2026', hint: 'Exibida na tela de abertura' })}
    ${fieldInput({ label: 'Data (detalhes)', path: 'event.detailDate', placeholder: '06 Set 2026' })}
    ${fieldInput({ label: 'Dia da semana', path: 'event.weekday', placeholder: 'Domingo' })}
    ${fieldInput({ label: 'Horário', path: 'event.time', placeholder: '17:00' })}
    ${fieldInput({ label: 'Fuso horário', path: 'event.timezone', placeholder: 'Horário de Brasília' })}
  `) + group('Local', `
    ${fieldInput({ label: 'Nome do local', path: 'event.locationName', placeholder: 'Mansão Ilha de Capri' })}
    ${fieldInput({ label: 'Cidade', path: 'event.locationCity', placeholder: 'São Bernardo do Campo' })}
  `);
}

function renderTextos() {
  return group('Introdução & Hero', `
    ${fieldInput({ label: 'Label do convite', path: 'texts.introLabel', placeholder: 'Convite', hint: 'Pequena tag acima da intro' })}
    ${fieldTextarea({ label: 'Texto de introdução', path: 'texts.intro', hint: 'Aparece na tela de entrada antes do convite' })}
    ${fieldInput({ label: 'Chamada no hero', path: 'texts.heroLabel', hint: 'Linha acima dos nomes dos noivos' })}
  `) + group('Contagem Regressiva', `
    ${fieldInput({ label: 'Tag da seção', path: 'texts.countdownTag', placeholder: 'Contagem Regressiva' })}
    ${fieldInput({ label: 'Título', path: 'texts.countdownTitle' })}
    ${fieldInput({ label: 'Mensagem quando o dia chegar', path: 'texts.countdownFinished', hint: 'Substitui a contagem no dia do evento' })}
  `) + group('Detalhes da Cerimônia', `
    ${fieldInput({ label: 'Tag da seção', path: 'texts.detailsTag', placeholder: 'Detalhes da Cerimônia' })}
    ${fieldInput({ label: 'Título', path: 'texts.detailsTitle' })}
    ${fieldTextarea({ label: 'Introdução', path: 'texts.detailsIntro' })}
    ${fieldInput({ label: 'Tipo de ocasião', path: 'texts.detailsOccasionValue', placeholder: 'Cerimônia & Recepção' })}
    ${fieldInput({ label: 'Subtexto da ocasião', path: 'texts.detailsOccasionSub', placeholder: 'Traje esporte fino' })}
  `) + group('RSVP — Confirmação de Presença', `
    ${fieldInput({ label: 'Tag da seção', path: 'texts.rsvpTag', placeholder: 'Confirmação de Presença' })}
    ${fieldInput({ label: 'Título', path: 'texts.rsvpTitle' })}
    ${fieldTextarea({ label: 'Subtítulo', path: 'texts.rsvpSubtitle' })}
    ${fieldInput({ label: 'Título do formulário', path: 'texts.rsvpFormTitle' })}
    ${fieldInput({ label: 'Subtítulo do formulário', path: 'texts.rsvpFormSubtitle' })}
    ${fieldInput({ label: 'Placeholder — nome', path: 'texts.rsvpPlaceholderName', placeholder: 'Seu nome completo' })}
    ${fieldInput({ label: 'Placeholder — telefone', path: 'texts.rsvpPlaceholderPhone', placeholder: 'Seu WhatsApp' })}
    ${fieldInput({ label: 'Botão — confirmar', path: 'texts.rsvpYesLabel' })}
    ${fieldInput({ label: 'Botão — não ir', path: 'texts.rsvpNoLabel' })}
    ${fieldInput({ label: 'Botão — enviar', path: 'texts.rsvpSubmit' })}
  `) + group('Rodapé', `
    ${fieldInput({ label: 'Nota do rodapé', path: 'texts.footerNote', placeholder: '06 . 09 . 2026 | São Bernardo do Campo' })}
  `);
}

function renderFaq() {
  const items = config.pages.faq.content.items ?? [];
  const intro = group('Introdução da Página', `
    ${fieldInput({ label: 'Título da página', path: 'pages.faq.content.title' })}
    ${fieldTextarea({ label: 'Introdução', path: 'pages.faq.content.intro' })}
  `);
  const list = listGroup({
    title: 'Perguntas e Respostas',
    addAction: 'add-faq',
    listId: 'faq-list',
    itemsHtml: items.map((item, i) => faqItemHtml(item, i)).join(''),
    emptyText: 'Nenhuma pergunta ainda. Clique em "+ Adicionar" para começar.',
  });
  return intro + list;
}

function renderHistoria() {
  const chapters = config.pages.historia.content.chapters ?? [];
  const intro = group('Introdução da Página', `
    ${fieldInput({ label: 'Título da página', path: 'pages.historia.content.title' })}
    ${fieldTextarea({ label: 'Introdução', path: 'pages.historia.content.intro' })}
  `);
  const list = listGroup({
    title: 'Capítulos',
    addAction: 'add-historia',
    listId: 'historia-list',
    itemsHtml: chapters.map((ch, i) => chapterHtml(ch, i)).join(''),
    emptyText: 'Nenhum capítulo. Clique em "+ Adicionar" para começar.',
  });
  return intro + list;
}

function renderHospedagem() {
  const hotels = config.pages.hospedagem.content.hotels ?? [];
  const restaurants = config.pages.hospedagem.content.restaurants ?? [];

  const intro = group('Introdução da Página', `
    ${fieldInput({ label: 'Título da página', path: 'pages.hospedagem.content.title' })}
    ${fieldTextarea({ label: 'Introdução', path: 'pages.hospedagem.content.intro' })}
  `);
  const hotelList = listGroup({
    title: 'Hotéis',
    addAction: 'add-hotels',
    listId: 'hotels-list',
    itemsHtml: hotels.map((h, i) => hospItemHtml(h, i, 'hotels')).join(''),
    emptyText: 'Nenhum hotel cadastrado.',
  });
  const restList = listGroup({
    title: 'Restaurantes',
    addAction: 'add-restaurants',
    listId: 'restaurants-list',
    itemsHtml: restaurants.map((r, i) => hospItemHtml(r, i, 'restaurants')).join(''),
    emptyText: 'Nenhum restaurante cadastrado.',
  });
  return intro + hotelList + restList;
}

// ── Theme tab ─────────────────────────────────────────────────────────────────

const DEFAULT_THEME_FILES = [
  'assets/config/themes/classic-gold.json',
  'assets/config/themes/classic-gold-light.json',
  'assets/config/themes/classic-silver.json',
  'assets/config/themes/classic-silver-light.json',
'assets/config/themes/classic-purple.json',
];

let themeCatalog = [];  // [{ path, meta, colors, fonts }]

function getThemeFiles() {
  if (Array.isArray(config?.themeFiles) && config.themeFiles.length > 0) {
    return config.themeFiles;
  }
  return DEFAULT_THEME_FILES;
}

async function loadThemeCatalog() {
  if (themeCatalog.length) return;
  const themeFiles = getThemeFiles();
  const results = await Promise.allSettled(themeFiles.map(async (path) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      path,
      name: data.meta?.name ?? path,
      description: data.meta?.description ?? '',
      colors: {
        background: data.colors?.background ?? '#1a1714',
        primary:    data.colors?.primary    ?? '#c9a84c',
        primarySoft:data.colors?.primarySoft?? '#e8d08a',
        text:       data.colors?.text       ?? '#faf7f2',
        surface:    data.colors?.surface    ?? '#222',
        border:     data.colors?.border     ?? 'rgba(201,168,76,0.2)',
      },
      fonts: {
        accent:  data.typography?.fonts?.accent  ?? "'Great Vibes', cursive",
        serif:   data.typography?.fonts?.serif   ?? "'Cormorant Garamond', serif",
        primary: data.typography?.fonts?.primary ?? "'Jost', sans-serif",
      },
    };
  }));
  themeCatalog = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

function colorSwatch(color) {
  return `<span class="ed-swatch" style="background:${esc(color)}" title="${esc(color)}"></span>`;
}

function themeCardHtml(theme) {
  const isActive = config.activeTheme === theme.path;
  const bg   = theme.colors.background;
  const fg   = theme.colors.text;
  const pri  = theme.colors.primary;
  const surf = theme.colors.surface;
  const bdr  = theme.colors.border;

  return `
    <div class="ed-theme-card${isActive ? ' is-active' : ''}" data-theme-path="${esc(theme.path)}">
      <div class="ed-theme-preview" style="background:${esc(bg)};border-color:${esc(bdr)}">
        <span class="ed-theme-preview-accent" style="font-family:${esc(theme.fonts.accent)};color:${esc(pri)}">
          Diego &amp; Siannah
        </span>
        <span class="ed-theme-preview-serif" style="font-family:${esc(theme.fonts.serif)};color:${esc(fg)}">
          CASAMENTO
        </span>
        <span class="ed-theme-preview-body" style="font-family:${esc(theme.fonts.primary)};color:${esc(fg)}">
          06 de setembro de 2026
        </span>
      </div>
      <div class="ed-theme-info" style="background:${esc(surf)}">
        <div class="ed-theme-meta">
          <span class="ed-theme-name" style="color:${esc(fg)}">${esc(theme.name)}</span>
          <span class="ed-theme-desc" style="color:${esc(fg)}">${esc(theme.description)}</span>
        </div>
        <div class="ed-theme-swatches">
          ${colorSwatch(bg)}
          ${colorSwatch(surf)}
          ${colorSwatch(pri)}
          ${colorSwatch(fg)}
          ${colorSwatch(bdr)}
        </div>
        <button class="ed-theme-btn${isActive ? ' is-active' : ''}" data-select-theme="${esc(theme.path)}">
          ${isActive ? 'Tema atual' : 'Usar este tema'}
        </button>
      </div>
    </div>`;
}

async function renderTema() {
  await loadThemeCatalog();
  const cards = themeCatalog.map(t => themeCardHtml(t)).join('');
  return `
    <div class="ed-group">
      <h3 class="ed-group-title">Tema Visual</h3>
      <p class="ed-theme-hint">Escolha o tema do convite. A seleção é salva ao exportar o site.json.</p>
      <div class="ed-theme-grid">${cards}</div>
    </div>`;
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'casal',      label: 'Casal & Evento',    render: renderCasal },
  { id: 'textos',     label: 'Textos Principais', render: renderTextos },
  { id: 'faq',        label: 'FAQ',               render: renderFaq },
  { id: 'historia',   label: 'Nossa História',    render: renderHistoria },
  { id: 'hospedagem', label: 'Hospedagem',        render: renderHospedagem },
  { id: 'tema',       label: 'Tema',              render: renderTema, async: true },
];

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderActiveTab() {
  // Tab buttons
  const tabBar = document.getElementById('tab-bar');
  tabBar.innerHTML = TABS.map(t => `
    <button class="ed-tab${t.id === activeTab ? ' is-active' : ''}" data-tab="${t.id}">
      ${esc(t.label)}
    </button>`).join('');

  // Content
  const tab = TABS.find(t => t.id === activeTab);
  const content = document.getElementById('tab-content');

  if (tab.async) {
    content.innerHTML = '<div class="ed-section"><p class="ed-loading">Carregando...</p></div>';
    tab.render().then(html => {
      content.innerHTML = `<div class="ed-section">${html}</div>`;
      bindContentEvents(content);
    });
  } else {
    content.innerHTML = `<div class="ed-section">${tab.render()}</div>`;
    bindContentEvents(content);
  }
}

// ── Event binding ─────────────────────────────────────────────────────────────

function bindContentEvents(root) {
  // Flat field changes
  root.addEventListener('input', (e) => {
    const { path, list, idx, key } = e.target.dataset;
    if (path) {
      setPath(config, path, e.target.value);
      markDirty();
    }
    if (list !== undefined && idx !== undefined && key !== undefined) {
      listArray(list)[parseInt(idx)][key] = e.target.value;
      markDirty();
    }
  });

  // Action buttons
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) handleAction(btn.dataset.action, btn.dataset.index !== undefined ? parseInt(btn.dataset.index) : null);

    // Theme selection
    const themeBtn = e.target.closest('[data-select-theme]');
    if (themeBtn) {
      config.activeTheme = themeBtn.dataset.selectTheme;
      markDirty();
      renderActiveTab();  // re-render to update active state
    }
  });
}

function listArray(name) {
  return {
    faq:         config.pages.faq.content.items,
    historia:    config.pages.historia.content.chapters,
    hotels:      config.pages.hospedagem.content.hotels,
    restaurants: config.pages.hospedagem.content.restaurants,
  }[name];
}

function handleAction(action, index) {
  switch (action) {
    case 'add-faq':
      config.pages.faq.content.items.push({ question: '', answer: '' }); break;
    case 'remove-faq':
      config.pages.faq.content.items.splice(index, 1); break;
    case 'add-historia':
      config.pages.historia.content.chapters.push({ year: '', title: '', text: '' }); break;
    case 'remove-historia':
      config.pages.historia.content.chapters.splice(index, 1); break;
    case 'add-hotels':
      config.pages.hospedagem.content.hotels.push({ name: '', description: '', link: '', linkLabel: 'Ver hotel' }); break;
    case 'remove-hotels':
      config.pages.hospedagem.content.hotels.splice(index, 1); break;
    case 'add-restaurants':
      config.pages.hospedagem.content.restaurants.push({ name: '', description: '', link: '', linkLabel: 'Ver no Maps' }); break;
    case 'remove-restaurants':
      config.pages.hospedagem.content.restaurants.splice(index, 1); break;
    default: return;
  }
  markDirty();
  renderActiveTab();
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  // Tab navigation
  document.getElementById('tab-bar').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn && btn.dataset.tab !== activeTab) {
      activeTab = btn.dataset.tab;
      renderActiveTab();
    }
  });

  // Import
  document.getElementById('import-file').addEventListener('change', handleFileImport);
  document.getElementById('btn-load-default').addEventListener('click', loadDefault);

  // Export
  document.getElementById('export-btn').addEventListener('click', exportJson);

  // Warn on unload
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) e.preventDefault();
  });
}

document.addEventListener('DOMContentLoaded', init);
