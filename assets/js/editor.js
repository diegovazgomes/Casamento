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
  const target = keys.reduce((o, k) => {
    if (o[k] === undefined || o[k] === null || typeof o[k] !== 'object' || Array.isArray(o[k])) {
      o[k] = {};
    }
    return o[k];
  }, obj);
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

function fieldInputRow(items) {
  return `
    <div class="ed-fields-grid">
      ${items.map(fieldInput).join('')}
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

function typographyLinkedCard({
  title,
  samplePath,
  sampleFallback,
  sampleHint,
  sizePath,
  sizePlaceholder,
  fontPath,
  fontPlaceholder,
}) {
  const sampleText = getPath(config, samplePath) || sampleFallback;
  const currentSize = getPath(config, sizePath);
  const currentFont = getPath(config, fontPath);

  return `
    <div class="ed-typo-card">
      <div class="ed-typo-card-head">
        <h4 class="ed-typo-card-title">${esc(title)}</h4>
        <span class="ed-typo-card-path">Texto de: ${esc(samplePath)}</span>
      </div>
      <p class="ed-typo-card-hint">${esc(sampleHint)}</p>
      <div class="ed-typo-preview" style="${currentSize ? `font-size:${esc(currentSize)};` : ''}${currentFont ? `font-family:${esc(currentFont)};` : ''}">
        ${esc(sampleText)}
      </div>
      <div class="ed-fields-grid">
        ${fieldInput({
          label: 'Tamanho',
          path: sizePath,
          placeholder: sizePlaceholder,
          hint: 'Ex: 13px, 2rem, clamp(...)',
        })}
        ${fieldInput({
          label: 'Fonte',
          path: fontPath,
          placeholder: fontPlaceholder,
          hint: "Ex: 'Jost', sans-serif",
        })}
      </div>
    </div>`;
}

function renderLinkedTypographyEditor({ title, hint, mappings }) {
  return group(title, `
    <p class="ed-theme-hint">${esc(hint)}</p>
    <div class="ed-typo-grid">
      ${mappings.map((item) => typographyLinkedCard(item)).join('')}
    </div>
  `);
}

const TYPOGRAPHY_LINKED_TEXTOS = [
  {
    title: 'Label de entrada',
    samplePath: 'texts.introLabel',
    sampleFallback: 'Convite',
    sampleHint: 'Pequena tag da tela inicial.',
    sizePath: 'themeOverrides.typography.sizes.sectionTag',
    sizePlaceholder: '9px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Texto de introdução',
    samplePath: 'texts.intro',
    sampleFallback: 'Um momento pensado para viver ao lado de quem faz parte da nossa vida.',
    sampleHint: 'Texto principal antes de abrir o convite.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Chamada do Hero',
    samplePath: 'texts.heroLabel',
    sampleFallback: 'Você foi convidado para o casamento de',
    sampleHint: 'Linha acima do nome do casal na capa.',
    sizePath: 'themeOverrides.typography.sizes.heroLabel',
    sizePlaceholder: '10px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Tag da contagem',
    samplePath: 'texts.countdownTag',
    sampleFallback: 'Contagem Regressiva',
    sampleHint: 'Etiqueta acima da seção de contagem.',
    sizePath: 'themeOverrides.typography.sizes.sectionTag',
    sizePlaceholder: '9px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Título da contagem',
    samplePath: 'texts.countdownTitle',
    sampleFallback: 'O grande dia se aproxima!',
    sampleHint: 'Título principal da seção de contagem.',
    sizePath: 'themeOverrides.typography.sizes.sectionTitle.max',
    sizePlaceholder: '56px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Mensagem final da contagem',
    samplePath: 'texts.countdownFinished',
    sampleFallback: 'O grande dia chegou.',
    sampleHint: 'Texto exibido quando a contagem termina.',
    sizePath: 'themeOverrides.typography.sizes.countdownFinished',
    sizePlaceholder: '30px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Tag de detalhes',
    samplePath: 'texts.detailsTag',
    sampleFallback: 'Detalhes da Cerimônia',
    sampleHint: 'Etiqueta da seção de detalhes.',
    sizePath: 'themeOverrides.typography.sizes.sectionTag',
    sizePlaceholder: '9px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Título de detalhes',
    samplePath: 'texts.detailsTitle',
    sampleFallback: 'O início de tudo o que queremos viver juntos.',
    sampleHint: 'Título grande da seção de detalhes.',
    sizePath: 'themeOverrides.typography.sizes.sectionTitle.max',
    sizePlaceholder: '56px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Introdução de detalhes',
    samplePath: 'texts.detailsIntro',
    sampleFallback: 'Uma celebração íntima, pensada para compartilhar esse momento com quem faz parte da nossa história.',
    sampleHint: 'Parágrafo explicativo da cerimônia.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Valor da ocasião',
    samplePath: 'texts.detailsOccasionValue',
    sampleFallback: 'Cerimônia & Recepção',
    sampleHint: 'Texto de destaque no card de ocasião.',
    sizePath: 'themeOverrides.typography.sizes.detailValue',
    sizePlaceholder: '20px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Subtexto da ocasião',
    samplePath: 'texts.detailsOccasionSub',
    sampleFallback: 'Traje esporte fino',
    sampleHint: 'Texto complementar no card de ocasião.',
    sizePath: 'themeOverrides.typography.sizes.detailSub',
    sizePlaceholder: '10px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Tag do RSVP',
    samplePath: 'texts.rsvpTag',
    sampleFallback: 'Confirmação de Presença',
    sampleHint: 'Etiqueta da seção de confirmação.',
    sizePath: 'themeOverrides.typography.sizes.sectionTag',
    sizePlaceholder: '9px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Título RSVP',
    samplePath: 'texts.rsvpTitle',
    sampleFallback: 'Esperamos você.',
    sampleHint: 'Título principal da confirmação de presença.',
    sizePath: 'themeOverrides.typography.sizes.rsvpTitle',
    sizePlaceholder: '38px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Subtítulo RSVP',
    samplePath: 'texts.rsvpSubtitle',
    sampleFallback: 'Pedimos, por gentileza, que confirme sua presença o quanto antes.',
    sampleHint: 'Texto explicativo do RSVP.',
    sizePath: 'themeOverrides.typography.sizes.rsvpSubtitle',
    sizePlaceholder: '11px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Título do formulário RSVP',
    samplePath: 'texts.rsvpFormTitle',
    sampleFallback: 'Confirmar Presença',
    sampleHint: 'Título no card do formulário.',
    sizePath: 'themeOverrides.typography.sizes.detailValue',
    sizePlaceholder: '20px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Subtítulo do formulário RSVP',
    samplePath: 'texts.rsvpFormSubtitle',
    sampleFallback: 'Preencha os dados para continuar no WhatsApp',
    sampleHint: 'Linha de apoio acima dos inputs.',
    sizePath: 'themeOverrides.typography.sizes.rsvpSubtitle',
    sizePlaceholder: '11px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Placeholder nome (RSVP)',
    samplePath: 'texts.rsvpPlaceholderName',
    sampleFallback: 'Seu nome completo',
    sampleHint: 'Texto de placeholder do campo nome.',
    sizePath: 'themeOverrides.typography.sizes.rsvpInput',
    sizePlaceholder: '12px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Placeholder telefone (RSVP)',
    samplePath: 'texts.rsvpPlaceholderPhone',
    sampleFallback: 'Seu WhatsApp',
    sampleHint: 'Texto de placeholder do campo telefone.',
    sizePath: 'themeOverrides.typography.sizes.rsvpInput',
    sizePlaceholder: '12px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Botão confirmar presença',
    samplePath: 'texts.rsvpYesLabel',
    sampleFallback: 'Confirmo presença',
    sampleHint: 'Rótulo da opção positiva.',
    sizePath: 'themeOverrides.typography.sizes.rsvpChoice',
    sizePlaceholder: '10px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Botão não poderei ir',
    samplePath: 'texts.rsvpNoLabel',
    sampleFallback: 'Não poderei ir',
    sampleHint: 'Rótulo da opção negativa.',
    sizePath: 'themeOverrides.typography.sizes.rsvpChoice',
    sizePlaceholder: '10px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Botão enviar RSVP',
    samplePath: 'texts.rsvpSubmit',
    sampleFallback: 'Continuar no WhatsApp',
    sampleHint: 'Texto do botão de envio do formulário.',
    sizePath: 'themeOverrides.typography.sizes.rsvpSubmit',
    sizePlaceholder: '10px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Nota do rodapé',
    samplePath: 'texts.footerNote',
    sampleFallback: '06 . 09 . 2026 | São Bernardo do Campo',
    sampleHint: 'Linha final abaixo dos nomes no rodapé.',
    sizePath: 'themeOverrides.typography.sizes.footerNote',
    sizePlaceholder: '10px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
];

const TYPOGRAPHY_LINKED_FAQ = [
  {
    title: 'FAQ - Tag',
    samplePath: 'pages.faq.content.tag',
    sampleFallback: 'FAQ',
    sampleHint: 'Etiqueta superior da página de FAQ.',
    sizePath: 'themeOverrides.typography.sizes.sectionTag',
    sizePlaceholder: '9px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'FAQ - Título da página',
    samplePath: 'pages.faq.content.title',
    sampleFallback: 'Tudo que você precisa saber',
    sampleHint: 'Título principal da página FAQ.',
    sizePath: 'themeOverrides.typography.sizes.sectionTitle.max',
    sizePlaceholder: '56px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'FAQ - Introdução',
    samplePath: 'pages.faq.content.intro',
    sampleFallback: 'Reunimos as perguntas mais frequentes para facilitar o seu preparo.',
    sampleHint: 'Parágrafo de abertura da FAQ.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'FAQ - Primeira pergunta',
    samplePath: 'pages.faq.content.items.0.question',
    sampleFallback: 'Qual é o dress code?',
    sampleHint: 'Exemplo de pergunta dentro dos cards.',
    sizePath: 'themeOverrides.typography.sizes.detailValue',
    sizePlaceholder: '20px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'FAQ - Primeira resposta',
    samplePath: 'pages.faq.content.items.0.answer',
    sampleFallback: 'Esporte fino. Pedimos gentilmente que evitem roupas brancas.',
    sampleHint: 'Exemplo de resposta dentro dos cards.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
];

const TYPOGRAPHY_LINKED_HISTORIA = [
  {
    title: 'História - Tag',
    samplePath: 'pages.historia.content.tag',
    sampleFallback: 'Nossa História',
    sampleHint: 'Etiqueta superior da página.',
    sizePath: 'themeOverrides.typography.sizes.sectionTag',
    sizePlaceholder: '9px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'História - Título da página',
    samplePath: 'pages.historia.content.title',
    sampleFallback: 'Como tudo começou',
    sampleHint: 'Título principal da página.',
    sizePath: 'themeOverrides.typography.sizes.sectionTitle.max',
    sizePlaceholder: '56px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'História - Introdução',
    samplePath: 'pages.historia.content.intro',
    sampleFallback: 'Uma história que é nossa, e que a partir de setembro passa a ser de vocês também.',
    sampleHint: 'Parágrafo de abertura da página.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'História - Primeiro capítulo (título)',
    samplePath: 'pages.historia.content.chapters.0.title',
    sampleFallback: 'O primeiro encontro',
    sampleHint: 'Título de um capítulo da linha do tempo.',
    sizePath: 'themeOverrides.typography.sizes.detailValue',
    sizePlaceholder: '20px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'História - Primeiro capítulo (texto)',
    samplePath: 'pages.historia.content.chapters.0.text',
    sampleFallback: 'Essa história começou em junho de 2013...',
    sampleHint: 'Texto corrido dos capítulos.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
];

const TYPOGRAPHY_LINKED_HOSPEDAGEM = [
  {
    title: 'Hospedagem - Tag',
    samplePath: 'pages.hospedagem.content.tag',
    sampleFallback: 'Para Quem Vem de Fora',
    sampleHint: 'Etiqueta superior da página.',
    sizePath: 'themeOverrides.typography.sizes.sectionTag',
    sizePlaceholder: '9px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Hospedagem - Título da página',
    samplePath: 'pages.hospedagem.content.title',
    sampleFallback: 'Fique à vontade para explorar',
    sampleHint: 'Título principal da página.',
    sizePath: 'themeOverrides.typography.sizes.sectionTitle.max',
    sizePlaceholder: '56px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Hospedagem - Introdução',
    samplePath: 'pages.hospedagem.content.intro',
    sampleFallback: 'Selecionamos algumas opções próximas ao local da festa para tornar sua estadia mais fácil.',
    sampleHint: 'Parágrafo de abertura da página.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Hospedagem - Primeiro hotel (nome)',
    samplePath: 'pages.hospedagem.content.hotels.0.name',
    sampleFallback: 'Hotel Exemplo 1',
    sampleHint: 'Nome dos cards de hotel.',
    sizePath: 'themeOverrides.typography.sizes.detailValue',
    sizePlaceholder: '20px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Hospedagem - Primeiro hotel (descrição)',
    samplePath: 'pages.hospedagem.content.hotels.0.description',
    sampleFallback: 'A 5 minutos do local. Café da manhã incluído.',
    sampleHint: 'Descrição dos cards de hotel.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
  {
    title: 'Hospedagem - Primeiro restaurante (nome)',
    samplePath: 'pages.hospedagem.content.restaurants.0.name',
    sampleFallback: 'Restaurante Exemplo 1',
    sampleHint: 'Nome dos cards de restaurante.',
    sizePath: 'themeOverrides.typography.sizes.detailValue',
    sizePlaceholder: '20px',
    fontPath: 'themeOverrides.typography.fonts.serif',
    fontPlaceholder: "'Cormorant Garamond', serif",
  },
  {
    title: 'Hospedagem - Primeiro restaurante (descrição)',
    samplePath: 'pages.hospedagem.content.restaurants.0.description',
    sampleFallback: 'Ótima opção para o almoço do dia anterior.',
    sampleHint: 'Descrição dos cards de restaurante.',
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
];

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
  `) + renderLinkedTypographyEditor({
    title: 'Fontes e Tamanhos por Texto',
    hint: 'Aqui você vê o texto real que será afetado. Edite o texto acima na mesma aba e ajuste a tipografia abaixo.',
    mappings: TYPOGRAPHY_LINKED_TEXTOS,
  });
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
  const typography = renderLinkedTypographyEditor({
    title: 'Tipografia da FAQ',
    hint: 'Mapeamento de fontes e tamanhos para os textos da página de FAQ.',
    mappings: TYPOGRAPHY_LINKED_FAQ,
  });
  return intro + list + typography;
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
  const typography = renderLinkedTypographyEditor({
    title: 'Tipografia da Nossa História',
    hint: 'Mapeamento de fontes e tamanhos para os textos da página de história.',
    mappings: TYPOGRAPHY_LINKED_HISTORIA,
  });
  return intro + list + typography;
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
  const typography = renderLinkedTypographyEditor({
    title: 'Tipografia da Hospedagem',
    hint: 'Mapeamento de fontes e tamanhos para os textos da página de hospedagem.',
    mappings: TYPOGRAPHY_LINKED_HOSPEDAGEM,
  });
  return intro + hotelList + restList + typography;
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

  const typographySection = group('Tipografia (override no site.json)', `
    <p class="ed-theme-hint">Esses campos ajustam fontes e tamanhos sem alterar o arquivo do tema. Deixe em branco para usar o valor padrão do tema selecionado.</p>
    <div class="ed-subsection">
      <h4 class="ed-subtitle">Famílias de fonte</h4>
      ${fieldInputRow([
        { label: 'Fonte principal', path: 'themeOverrides.typography.fonts.primary', placeholder: "'Jost', sans-serif" },
        { label: 'Fonte serifada', path: 'themeOverrides.typography.fonts.serif', placeholder: "'Cormorant Garamond', serif" },
        { label: 'Fonte de destaque', path: 'themeOverrides.typography.fonts.accent', placeholder: "'Great Vibes', cursive" },
      ])}
    </div>
    <div class="ed-subsection">
      <h4 class="ed-subtitle">Tamanhos</h4>
      ${fieldInputRow([
        { label: 'Base', path: 'themeOverrides.typography.sizes.base', placeholder: '13px' },
        { label: 'Label Hero', path: 'themeOverrides.typography.sizes.heroLabel', placeholder: '10px' },
        { label: 'Data Hero', path: 'themeOverrides.typography.sizes.heroDate', placeholder: '11px' },
      ])}
      ${fieldInputRow([
        { label: 'Nome Hero min', path: 'themeOverrides.typography.sizes.heroNames.min', placeholder: '54px' },
        { label: 'Nome Hero fluid', path: 'themeOverrides.typography.sizes.heroNames.fluid', placeholder: '12vw' },
        { label: 'Nome Hero max', path: 'themeOverrides.typography.sizes.heroNames.max', placeholder: '110px' },
      ])}
      ${fieldInputRow([
        { label: 'Tag de seção', path: 'themeOverrides.typography.sizes.sectionTag', placeholder: '9px' },
        { label: 'Título seção min', path: 'themeOverrides.typography.sizes.sectionTitle.min', placeholder: '34px' },
        { label: 'Título seção fluid', path: 'themeOverrides.typography.sizes.sectionTitle.fluid', placeholder: '7vw' },
      ])}
      ${fieldInputRow([
        { label: 'Título seção max', path: 'themeOverrides.typography.sizes.sectionTitle.max', placeholder: '56px' },
        { label: 'Texto seção', path: 'themeOverrides.typography.sizes.sectionBody', placeholder: '13px' },
        { label: 'Número contagem', path: 'themeOverrides.typography.sizes.countdownNumber', placeholder: '42px' },
      ])}
      ${fieldInputRow([
        { label: 'Título RSVP', path: 'themeOverrides.typography.sizes.rsvpTitle', placeholder: '38px' },
        { label: 'Subtítulo RSVP', path: 'themeOverrides.typography.sizes.rsvpSubtitle', placeholder: '11px' },
        { label: 'Input RSVP', path: 'themeOverrides.typography.sizes.rsvpInput', placeholder: '12px' },
      ])}
      ${fieldInputRow([
        { label: 'Botão RSVP', path: 'themeOverrides.typography.sizes.rsvpSubmit', placeholder: '10px' },
        { label: 'Nomes rodapé', path: 'themeOverrides.typography.sizes.footerNames', placeholder: '30px' },
        { label: 'Nota rodapé', path: 'themeOverrides.typography.sizes.footerNote', placeholder: '10px' },
      ])}
    </div>
  `);

  return `
    <div class="ed-group">
      <h3 class="ed-group-title">Tema Visual</h3>
      <p class="ed-theme-hint">Escolha o tema do convite. A seleção é salva ao exportar o site.json.</p>
      <div class="ed-theme-grid">${cards}</div>
    </div>
    ${typographySection}`;
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
