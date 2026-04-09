/**
 * editor.js
 * Family-friendly content editor for site.json.
 * Works entirely in-browser: import JSON → edit → export JSON.
 * No build step, no server required.
 */

import {
  debounce,
  escapeHtml as esc,
  getPath,
  isIndexKey,
  isValidHttpUrl,
  removePath,
  setPath,
} from './utils.js';

// ── State ─────────────────────────────────────────────────────────────────────

let config = null;
let isDirty = false;
let activeTab = 'casal';
let _siteSchema = null;

// ── Path utilities ────────────────────────────────────────────────────────────

function isThemeOverridePath(path) {
  return path.startsWith('themeOverrides.');
}

function setConfigValue(path, value) {
  if (isThemeOverridePath(path) && String(value).trim() === '') {
    removePath(config, path);
    return;
  }
  setPath(config, path, value);
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

async function startEditor(parsed) {
  config = parsed;
  normalizeListCollections(config);
  document.getElementById('import-screen').classList.add('hidden');
  document.getElementById('editor-screen').classList.remove('hidden');

  await loadSchema();
  renderActiveTab();
  markClean();
  revalidate();
}

function downloadJson(filename, payload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ensureArrayPath(root, path) {
  const current = getPath(root, path);

  if (Array.isArray(current)) {
    return;
  }

  if (current && typeof current === 'object') {
    const ordered = Object.keys(current)
      .filter(isIndexKey)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => current[k]);
    setPath(root, path, ordered);
    return;
  }

  setPath(root, path, []);
}

function normalizeListCollections(root) {
  ensureArrayPath(root, 'pages.faq.content.items');
  ensureArrayPath(root, 'pages.historia.content.chapters');
  ensureArrayPath(root, 'pages.historia.content.gallery');
  ensureArrayPath(root, 'pages.hospedagem.content.hotels');
  ensureArrayPath(root, 'pages.hospedagem.content.restaurants');
}

// ── Schema validation ─────────────────────────────────────────────────────────

async function loadSchema() {
  if (_siteSchema) return _siteSchema;
  try {
    const res = await fetch('assets/config/schemas/site-schema.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _siteSchema = await res.json();
    return _siteSchema;
  } catch {
    return null;
  }
}

function checkType(value, type) {
  switch (type) {
    case 'string':  return typeof value === 'string';
    case 'number':  return typeof value === 'number' && !isNaN(value);
    case 'boolean': return typeof value === 'boolean';
    case 'array':   return Array.isArray(value);
    case 'object':  return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':    return value === null;
    default:        return true;
  }
}

function validateAgainstSchema(data, schema, path, rootSchema) {
  if (path === undefined) path = '';
  if (rootSchema === undefined) rootSchema = schema;
  const results = [];
  if (!schema) return results;

  // Resolve $ref before any other checks
  if (schema.$ref) {
    const refParts = typeof schema.$ref === 'string' && schema.$ref.startsWith('#/')
      ? schema.$ref.slice(2).split('/')
      : null;
    if (refParts) {
      const resolved = refParts.reduce((obj, key) => obj?.[key], rootSchema);
      if (resolved) return validateAgainstSchema(data, resolved, path, rootSchema);
    }
    return results;
  }

  // Type check (only when value is present)
  if (schema.type && data !== null && data !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => checkType(data, t))) {
      const label = path || 'raiz';
      results.push({ path: label, message: `Deve ser do tipo ${types.join(' ou ')}`, severity: 'error' });
      return results;
    }
  }

  // Enum check
  if (schema.enum && data !== undefined && data !== null) {
    if (!schema.enum.includes(data)) {
      results.push({ path, message: `Valor inválido. Permitido: ${schema.enum.join(', ')}`, severity: 'error' });
    }
  }

  // Required fields
  if (schema.required && Array.isArray(schema.required)) {
    const obj = (typeof data === 'object' && data !== null && !Array.isArray(data)) ? data : {};
    for (const key of schema.required) {
      const val = obj[key];
      if (val === undefined || val === null) {
        const fieldPath = path ? `${path}.${key}` : key;
        results.push({ path: fieldPath, message: 'Campo obrigatório ausente', severity: 'error' });
      }
    }
  }

  // Properties — recurse into existing values
  if (schema.properties) {
    const obj = (typeof data === 'object' && data !== null && !Array.isArray(data)) ? data : {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (obj[key] !== undefined) {
        const subPath = path ? `${path}.${key}` : key;
        const sub = validateAgainstSchema(obj[key], propSchema, subPath, rootSchema);
        for (const r of sub) results.push(r);
      }
    }
  }

  // Array items
  if (schema.items && Array.isArray(data)) {
    data.forEach((item, i) => {
      const subPath = `${path}[${i}]`;
      const sub = validateAgainstSchema(item, schema.items, subPath, rootSchema);
      for (const r of sub) results.push(r);
    });
  }

  // Format: uri
  if (schema.format === 'uri' && typeof data === 'string' && data.trim()) {
    if (!isValidHttpUrl(data)) {
      results.push({ path, message: 'Deve ser uma URL válida (http:// ou https://)', severity: 'error' });
    }
  }

  // Numeric range
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      results.push({ path, message: `Deve ser ≥ ${schema.minimum}`, severity: 'warning' });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      results.push({ path, message: `Deve ser ≤ ${schema.maximum}`, severity: 'warning' });
    }
  }

  return results;
}

function renderValidationBanner(results) {
  document.getElementById('validation-banner')?.remove();

  const errors   = results.filter((r) => r.severity === 'error');
  const warnings = results.filter((r) => r.severity === 'warning');

  if (errors.length === 0 && warnings.length === 0) {
    const banner = document.createElement('div');
    banner.id = 'validation-banner';
    banner.setAttribute('role', 'status');
    banner.style.cssText = 'background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:10px 24px 12px;font-size:12px;line-height:1.6;';
    banner.innerHTML = `<strong style="color:#166534">✓ Configuração válida — nenhum problema encontrado</strong>`;
    document.querySelector('.ed-tab-bar-wrap')?.insertAdjacentElement('afterend', banner);
    setTimeout(() => banner.remove(), 3000);
    return;
  }

  const hasErrors  = errors.length > 0;
  const bgColor    = hasErrors ? '#fef2f2' : '#fffbeb';
  const bdColor    = hasErrors ? '#fecaca' : '#fde68a';
  const titleColor = hasErrors ? '#991b1b' : '#92400e';
  let title;
  if (errors.length > 0 && warnings.length > 0) {
    title = `${errors.length} erro${errors.length > 1 ? 's' : ''}, ${warnings.length} aviso${warnings.length > 1 ? 's' : ''} de validação`;
  } else if (errors.length > 0) {
    title = `${errors.length} erro${errors.length > 1 ? 's' : ''} de validação`;
  } else {
    title = `${warnings.length} aviso${warnings.length > 1 ? 's' : ''} de validação`;
  }

  const allItems  = [...errors, ...warnings];
  const itemsHtml = allItems
    .map((r) => `<li><code style="background:rgba(0,0,0,0.06);padding:1px 4px;border-radius:3px;">${esc(r.path)}</code> — ${esc(r.message)}</li>`)
    .join('');

  const banner = document.createElement('div');
  banner.id = 'validation-banner';
  banner.style.cssText = [
    `background:${bgColor}`,
    `border-bottom:1px solid ${bdColor}`,
    'padding:10px 24px 12px',
    'font-size:12px',
    'line-height:1.6',
  ].join(';');
  banner.innerHTML = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;">
      <strong style="color:${titleColor}">⚠ ${esc(title)}</strong>
      <button
        onclick="document.getElementById('validation-banner')?.remove()"
        style="background:none;border:none;cursor:pointer;color:#666;font-size:12px;padding:0;flex-shrink:0;"
        aria-label="Fechar aviso de validação">
        Fechar ×
      </button>
    </div>
    <ul style="margin-top:6px;padding-left:16px;color:#4b4b4b;">${itemsHtml}</ul>`;

  document.querySelector('.ed-tab-bar-wrap')?.insertAdjacentElement('afterend', banner);
}

function collectInvalidAccommodationLinks() {
  const invalid = [];
  const hotels = config?.pages?.hospedagem?.content?.hotels ?? [];
  const restaurants = config?.pages?.hospedagem?.content?.restaurants ?? [];

  hotels.forEach((item, i) => {
    const link = String(item?.link ?? '').trim();
    if (link && !isValidHttpUrl(link)) {
      invalid.push(`Hotel ${i + 1}: ${link}`);
    }
  });

  restaurants.forEach((item, i) => {
    const link = String(item?.link ?? '').trim();
    if (link && !isValidHttpUrl(link)) {
      invalid.push(`Restaurante ${i + 1}: ${link}`);
    }
  });

  return invalid;
}

// ── Revalidation ──────────────────────────────────────────────────────────────

function revalidate() {
  if (!config || !_siteSchema) return;
  const schemaResults = validateAgainstSchema(config, _siteSchema);
  const linkErrors = collectInvalidAccommodationLinks().map((msg) => ({
    path: 'pages.hospedagem.content',
    message: msg,
    severity: 'error',
  }));
  renderValidationBanner([...schemaResults, ...linkErrors]);
}

const debouncedRevalidate = debounce(revalidate, 600);

async function exportJson() {
  const schema = await loadSchema();
  const schemaErrors = schema
    ? validateAgainstSchema(config, schema).filter((r) => r.severity === 'error')
    : [];
  const invalidLinks = collectInvalidAccommodationLinks();

  if (schemaErrors.length > 0 || invalidLinks.length > 0) {
    const linkResults = invalidLinks.map((msg) => ({
      path: 'pages.hospedagem.content',
      message: msg,
      severity: 'error',
    }));
    renderValidationBanner([...schemaErrors, ...linkResults]);
    document.getElementById('validation-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  downloadJson('site.json', config);
  markClean();
}

function normalizeRequiredPath(path) {
  return String(path || '').replace(/\[\d+\]/g, '').replace(/\.\d+(?=\.|$)/g, '');
}

function isFieldRequired(path) {
  if (!_siteSchema || !path) return false;

  const normalizedPath = normalizeRequiredPath(path);
  const parts = normalizedPath.split('.').filter(Boolean);
  if (parts.length === 0) return false;

  let schemaNode = _siteSchema;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];

    if (schemaNode.type === 'array') {
      schemaNode = schemaNode.items ?? null;
    }

    if (!schemaNode?.properties || !schemaNode.properties[key]) {
      return false;
    }

    schemaNode = schemaNode.properties[key];
  }

  if (schemaNode?.type === 'array') {
    schemaNode = schemaNode.items ?? null;
  }

  const parentRequired = Array.isArray(schemaNode?.required) ? schemaNode.required : [];
  const fieldKey = parts[parts.length - 1];

  return parentRequired.includes(fieldKey);
}

// ── Field templates (return HTML strings) ─────────────────────────────────────

function fieldInput({ label, path, placeholder = '', hint = '', inputType = 'text', cast = '', required = isFieldRequired(path) }) {
  const val = esc(getPath(config, path));
  const requiredMark = required ? '<span class="ed-required" aria-hidden="true">*</span>' : '';
  return `
    <div class="ed-field${required ? ' is-required' : ''}">
      <label class="ed-label">
        ${esc(label)}${requiredMark}
        ${hint ? `<span class="ed-hint">${esc(hint)}</span>` : ''}
      </label>
      <input class="ed-input${required ? ' is-required' : ''}" type="${esc(inputType)}" data-path="${path}"
        ${cast ? `data-cast="${esc(cast)}"` : ''}
        ${required ? 'aria-required="true"' : ''}
        value="${val}" placeholder="${esc(placeholder)}">
    </div>`;
}

function fieldInputRow(items) {
  return `
    <div class="ed-fields-grid">
      ${items.map(fieldInput).join('')}
    </div>`;
}

function fieldTextarea({ label, path, placeholder = '', hint = '', tall = false, required = isFieldRequired(path) }) {
  const val = esc(getPath(config, path));
  const requiredMark = required ? '<span class="ed-required" aria-hidden="true">*</span>' : '';
  return `
    <div class="ed-field${required ? ' is-required' : ''}">
      <label class="ed-label">
        ${esc(label)}${requiredMark}
        ${hint ? `<span class="ed-hint">${esc(hint)}</span>` : ''}
      </label>
      <textarea class="ed-textarea${tall ? ' ed-textarea--tall' : ''}${required ? ' is-required' : ''}" data-path="${path}"
        ${required ? 'aria-required="true"' : ''}
        placeholder="${esc(placeholder)}">${val}</textarea>
    </div>`;
}

function typographyLinkedCard({
  title,
  samplePath,
  sampleFallback,
  sampleHint,
  textLabel = 'Texto',
  textPlaceholder = '',
  textMultiline = false,
  textInputType = 'text',
  sizePath,
  sizePlaceholder,
  sizeHint = 'Ex: 13px, 2rem, clamp(...)',
  fontPath,
  fontPlaceholder,
  fontHint = "Fonte compartilhada por outros textos deste mesmo grupo.",
  showTypographyControls = true,
}) {
  const sampleText = getPath(config, samplePath) || sampleFallback;
  const currentSize = showTypographyControls ? getPath(config, sizePath) : '';
  const currentFont = showTypographyControls ? getPath(config, fontPath) : '';

  return `
    <div class="ed-typo-card">
      <div class="ed-typo-card-head">
        <h4 class="ed-typo-card-title">${esc(title)}</h4>
        <span class="ed-typo-card-path">Texto de: ${esc(samplePath)}</span>
      </div>
      <p class="ed-typo-card-hint">${esc(sampleHint)}</p>
      ${textMultiline
        ? fieldTextarea({ label: textLabel, path: samplePath, placeholder: textPlaceholder })
        : fieldInput({ label: textLabel, path: samplePath, placeholder: textPlaceholder, inputType: textInputType })}
      <div
        class="ed-typo-preview"
        data-sample-path="${esc(samplePath)}"
        data-sample-fallback="${esc(sampleFallback)}"
        data-size-path="${esc(showTypographyControls ? sizePath : '')}"
        data-font-path="${esc(showTypographyControls ? fontPath : '')}"
        style="${currentSize ? `font-size:${esc(currentSize)};` : ''}${currentFont ? `font-family:${esc(currentFont)};` : ''}">
        ${esc(sampleText)}
      </div>
      ${showTypographyControls ? `
      <div class="ed-fields-grid">
        ${fieldInput({
          label: 'Tamanho',
          path: sizePath,
          placeholder: sizePlaceholder,
          hint: sizeHint,
        })}
        ${fieldInput({
          label: 'Fonte (compartilhada)',
          path: fontPath,
          placeholder: fontPlaceholder,
          hint: fontHint,
        })}
      </div>` : ''}
    </div>`;
}

function renderCoupleNamesTypography() {
  const sampleText = getPath(config, 'couple.names') || 'Siannah & Diego';
  const heroMax = getPath(config, 'themeOverrides.typography.sizes.heroNames.max');
  const accentFont = getPath(config, 'themeOverrides.typography.fonts.accent');

  return group('Nomes do Casal (Hero + Rodapé)', `
    <p class="ed-theme-hint">Controle dedicado do texto ${esc('"Siannah & Diego"')} no hero e no rodapé.</p>
    <div class="ed-typo-card">
      <div class="ed-typo-card-head">
        <h4 class="ed-typo-card-title">Nome do casal</h4>
        <span class="ed-typo-card-path">Texto de: couple.names</span>
      </div>
      <p class="ed-typo-card-hint">Ajuste os 3 valores do hero (clamp) e o tamanho do rodapé.</p>
      <div
        class="ed-typo-preview"
        data-sample-path="couple.names"
        data-sample-fallback="Siannah & Diego"
        data-size-path="themeOverrides.typography.sizes.heroNames.max"
        data-font-path="themeOverrides.typography.fonts.accent"
        style="${heroMax ? `font-size:${esc(heroMax)};` : ''}${accentFont ? `font-family:${esc(accentFont)};` : ''}">
        ${esc(sampleText)}
      </div>
      ${fieldInputRow([
        { label: 'Hero min', path: 'themeOverrides.typography.sizes.heroNames.min', placeholder: '54px', hint: 'Primeiro valor do clamp()' },
        { label: 'Hero fluid', path: 'themeOverrides.typography.sizes.heroNames.fluid', placeholder: '12vw', hint: 'Segundo valor do clamp()' },
        { label: 'Hero max', path: 'themeOverrides.typography.sizes.heroNames.max', placeholder: '110px', hint: 'Terceiro valor do clamp()' },
      ])}
      ${fieldInputRow([
        { label: 'Rodapé nomes', path: 'themeOverrides.typography.sizes.footerNames', placeholder: '30px', hint: 'Tamanho dos nomes no rodapé' },
        { label: 'Fonte de destaque', path: 'themeOverrides.typography.fonts.accent', placeholder: "'Great Vibes', cursive", hint: 'Fonte compartilhada entre hero e rodapé' },
      ])}
    </div>
  `);
}

function refreshTypographyPreviews(root) {
  root.querySelectorAll('.ed-typo-preview').forEach((preview) => {
    const samplePath = preview.dataset.samplePath;
    const sampleFallback = preview.dataset.sampleFallback ?? '';
    const sizePath = preview.dataset.sizePath;
    const fontPath = preview.dataset.fontPath;

    const text = getPath(config, samplePath) || sampleFallback;
    const size = sizePath ? getPath(config, sizePath) : '';
    const font = fontPath ? getPath(config, fontPath) : '';

    preview.textContent = text;
    preview.style.fontSize = size || '';
    preview.style.fontFamily = font || '';
  });
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
    textLabel: 'Texto',
    textPlaceholder: 'Convite',
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
    textLabel: 'Texto',
    textPlaceholder: 'Texto da introdução',
    textMultiline: true,
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
    textLabel: 'Texto',
    textPlaceholder: 'Você foi convidado para o casamento de',
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
    textLabel: 'Texto',
    textPlaceholder: 'Contagem Regressiva',
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
    textLabel: 'Texto',
    textPlaceholder: 'O grande dia se aproxima!',
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
    textLabel: 'Texto',
    textPlaceholder: 'O grande dia chegou.',
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
    textLabel: 'Texto',
    textPlaceholder: 'Detalhes da Cerimônia',
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
    textLabel: 'Texto',
    textPlaceholder: 'O início de tudo o que queremos viver juntos.',
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
    textLabel: 'Texto',
    textPlaceholder: 'Texto de introdução da cerimônia',
    textMultiline: true,
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
    textLabel: 'Texto',
    textPlaceholder: 'Cerimônia & Recepção',
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
    textLabel: 'Texto',
    textPlaceholder: 'Traje esporte fino',
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
    textLabel: 'Texto',
    textPlaceholder: 'Confirmação de Presença',
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
    textLabel: 'Texto',
    textPlaceholder: 'Esperamos você.',
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
    textLabel: 'Texto',
    textPlaceholder: 'Texto explicativo do RSVP',
    textMultiline: true,
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
    textLabel: 'Texto',
    textPlaceholder: 'Confirmar Presença',
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
    textLabel: 'Texto',
    textPlaceholder: 'Preencha os dados para continuar no WhatsApp',
    textMultiline: true,
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
    textLabel: 'Texto',
    textPlaceholder: 'Seu nome completo',
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
    textLabel: 'Texto',
    textPlaceholder: 'Seu WhatsApp',
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
    textLabel: 'Texto',
    textPlaceholder: 'Confirmo presença',
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
    textLabel: 'Texto',
    textPlaceholder: 'Não poderei ir',
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
    textLabel: 'Texto',
    textPlaceholder: 'Continuar no WhatsApp',
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
    textLabel: 'Texto',
    textPlaceholder: '06 . 09 . 2026 | São Bernardo do Campo',
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
    textLabel: 'Texto',
    textPlaceholder: 'FAQ',
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
    textLabel: 'Texto',
    textPlaceholder: 'Tudo que você precisa saber',
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
    textLabel: 'Texto',
    textPlaceholder: 'Introdução da FAQ',
    textMultiline: true,
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
];

function buildFaqItemMappings(items) {
  return items.flatMap((item, i) => ([
    {
      title: `FAQ - Pergunta ${i + 1}`,
      samplePath: `pages.faq.content.items.${i}.question`,
      sampleFallback: item.question || `Pergunta ${i + 1}`,
      sampleHint: 'Texto da pergunta neste item da lista.',
      textLabel: 'Pergunta',
      textPlaceholder: 'Digite a pergunta',
      sizePath: 'themeOverrides.typography.sizes.detailValue',
      sizePlaceholder: '20px',
      fontPath: 'themeOverrides.typography.fonts.serif',
      fontPlaceholder: "'Cormorant Garamond', serif",
    },
    {
      title: `FAQ - Resposta ${i + 1}`,
      samplePath: `pages.faq.content.items.${i}.answer`,
      sampleFallback: item.answer || `Resposta ${i + 1}`,
      sampleHint: 'Texto da resposta neste item da lista.',
      textLabel: 'Resposta',
      textPlaceholder: 'Digite a resposta',
      textMultiline: true,
      sizePath: 'themeOverrides.typography.sizes.sectionBody',
      sizePlaceholder: '13px',
      fontPath: 'themeOverrides.typography.fonts.primary',
      fontPlaceholder: "'Jost', sans-serif",
    },
  ]));
}

const TYPOGRAPHY_LINKED_HISTORIA = [
  {
    title: 'História - Tag',
    samplePath: 'pages.historia.content.tag',
    sampleFallback: 'Nossa História',
    sampleHint: 'Etiqueta superior da página.',
    textLabel: 'Texto',
    textPlaceholder: 'Nossa História',
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
    textLabel: 'Texto',
    textPlaceholder: 'Como tudo começou',
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
    textLabel: 'Texto',
    textPlaceholder: 'Introdução da história',
    textMultiline: true,
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
];

function buildHistoriaMappings(chapters) {
  return chapters.flatMap((ch, i) => ([
    {
      title: `História - Capítulo ${i + 1} (título)`,
      samplePath: `pages.historia.content.chapters.${i}.title`,
      sampleFallback: ch.title || `Capítulo ${i + 1}`,
      sampleHint: 'Título deste capítulo da linha do tempo.',
      textLabel: 'Título do capítulo',
      textPlaceholder: 'Digite o título',
      sizePath: 'themeOverrides.typography.sizes.detailValue',
      sizePlaceholder: '20px',
      fontPath: 'themeOverrides.typography.fonts.serif',
      fontPlaceholder: "'Cormorant Garamond', serif",
    },
    {
      title: `História - Capítulo ${i + 1} (texto)`,
      samplePath: `pages.historia.content.chapters.${i}.text`,
      sampleFallback: ch.text || `Texto do capítulo ${i + 1}`,
      sampleHint: 'Texto corrido deste capítulo.',
      textLabel: 'Texto do capítulo',
      textPlaceholder: 'Digite o texto do capítulo',
      textMultiline: true,
      sizePath: 'themeOverrides.typography.sizes.sectionBody',
      sizePlaceholder: '13px',
      fontPath: 'themeOverrides.typography.fonts.primary',
      fontPlaceholder: "'Jost', sans-serif",
    },
  ]));
}

const TYPOGRAPHY_LINKED_HOSPEDAGEM = [
  {
    title: 'Hospedagem - Tag',
    samplePath: 'pages.hospedagem.content.tag',
    sampleFallback: 'Para Quem Vem de Fora',
    sampleHint: 'Etiqueta superior da página.',
    textLabel: 'Texto',
    textPlaceholder: 'Para Quem Vem de Fora',
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
    textLabel: 'Texto',
    textPlaceholder: 'Fique à vontade para explorar',
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
    textLabel: 'Texto',
    textPlaceholder: 'Introdução da hospedagem',
    textMultiline: true,
    sizePath: 'themeOverrides.typography.sizes.sectionBody',
    sizePlaceholder: '13px',
    fontPath: 'themeOverrides.typography.fonts.primary',
    fontPlaceholder: "'Jost', sans-serif",
  },
];

function buildHospedagemMappings(hotels, restaurants) {
  const hotelMappings = hotels.flatMap((item, i) => ([
    {
      title: `Hospedagem - Hotel ${i + 1} (nome)`,
      samplePath: `pages.hospedagem.content.hotels.${i}.name`,
      sampleFallback: item.name || `Hotel ${i + 1}`,
      sampleHint: 'Nome deste card de hotel.',
      textLabel: 'Nome do hotel',
      textPlaceholder: 'Digite o nome do hotel',
      sizePath: 'themeOverrides.typography.sizes.detailValue',
      sizePlaceholder: '20px',
      fontPath: 'themeOverrides.typography.fonts.serif',
      fontPlaceholder: "'Cormorant Garamond', serif",
    },
    {
      title: `Hospedagem - Hotel ${i + 1} (descrição)`,
      samplePath: `pages.hospedagem.content.hotels.${i}.description`,
      sampleFallback: item.description || `Descrição do hotel ${i + 1}`,
      sampleHint: 'Descrição deste card de hotel.',
      textLabel: 'Descrição do hotel',
      textPlaceholder: 'Digite a descrição do hotel',
      textMultiline: true,
      sizePath: 'themeOverrides.typography.sizes.sectionBody',
      sizePlaceholder: '13px',
      fontPath: 'themeOverrides.typography.fonts.primary',
      fontPlaceholder: "'Jost', sans-serif",
    },
    {
      title: `Hospedagem - Hotel ${i + 1} (link)` ,
      samplePath: `pages.hospedagem.content.hotels.${i}.link`,
      sampleFallback: item.link || '',
      sampleHint: 'URL de destino do botão. Deixe vazio para ocultar o botão no site.',
      textLabel: 'Link do hotel',
      textPlaceholder: 'https://exemplo.com',
      textInputType: 'url',
      showTypographyControls: false,
      sizePath: '',
      sizePlaceholder: '',
      fontPath: '',
      fontPlaceholder: '',
    },
    {
      title: `Hospedagem - Hotel ${i + 1} (texto do botão)` ,
      samplePath: `pages.hospedagem.content.hotels.${i}.linkLabel`,
      sampleFallback: item.linkLabel || 'Ver hotel',
      sampleHint: 'Texto exibido no botão de redirecionamento.',
      textLabel: 'Texto do botão',
      textPlaceholder: 'Ver hotel',
      showTypographyControls: false,
      sizePath: '',
      sizePlaceholder: '',
      fontPath: '',
      fontPlaceholder: '',
    },
  ]));

  const restaurantMappings = restaurants.flatMap((item, i) => ([
    {
      title: `Hospedagem - Restaurante ${i + 1} (nome)`,
      samplePath: `pages.hospedagem.content.restaurants.${i}.name`,
      sampleFallback: item.name || `Restaurante ${i + 1}`,
      sampleHint: 'Nome deste card de restaurante.',
      textLabel: 'Nome do restaurante',
      textPlaceholder: 'Digite o nome do restaurante',
      sizePath: 'themeOverrides.typography.sizes.detailValue',
      sizePlaceholder: '20px',
      fontPath: 'themeOverrides.typography.fonts.serif',
      fontPlaceholder: "'Cormorant Garamond', serif",
    },
    {
      title: `Hospedagem - Restaurante ${i + 1} (descrição)`,
      samplePath: `pages.hospedagem.content.restaurants.${i}.description`,
      sampleFallback: item.description || `Descrição do restaurante ${i + 1}`,
      sampleHint: 'Descrição deste card de restaurante.',
      textLabel: 'Descrição do restaurante',
      textPlaceholder: 'Digite a descrição do restaurante',
      textMultiline: true,
      sizePath: 'themeOverrides.typography.sizes.sectionBody',
      sizePlaceholder: '13px',
      fontPath: 'themeOverrides.typography.fonts.primary',
      fontPlaceholder: "'Jost', sans-serif",
    },
    {
      title: `Hospedagem - Restaurante ${i + 1} (link)` ,
      samplePath: `pages.hospedagem.content.restaurants.${i}.link`,
      sampleFallback: item.link || '',
      sampleHint: 'URL de destino do botão. Deixe vazio para ocultar o botão no site.',
      textLabel: 'Link do restaurante',
      textPlaceholder: 'https://maps.google.com/...',
      textInputType: 'url',
      showTypographyControls: false,
      sizePath: '',
      sizePlaceholder: '',
      fontPath: '',
      fontPlaceholder: '',
    },
    {
      title: `Hospedagem - Restaurante ${i + 1} (texto do botão)` ,
      samplePath: `pages.hospedagem.content.restaurants.${i}.linkLabel`,
      sampleFallback: item.linkLabel || 'Ver no Maps',
      sampleHint: 'Texto exibido no botão de redirecionamento.',
      textLabel: 'Texto do botão',
      textPlaceholder: 'Ver no Maps',
      showTypographyControls: false,
      sizePath: '',
      sizePlaceholder: '',
      fontPath: '',
      fontPlaceholder: '',
    },
  ]));

  return [...hotelMappings, ...restaurantMappings];
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
  return renderCoupleNamesTypography() + renderLinkedTypographyEditor({
    title: 'Fontes e Tamanhos por Texto',
    hint: 'Fluxo completo: edite o texto e, no mesmo bloco, ajuste tamanho e fonte.',
    mappings: TYPOGRAPHY_LINKED_TEXTOS,
  });
}

function renderListManager({ title, addAction, removeAction, items, labelFromItem }) {
  const content = items.length
    ? items.map((item, i) => `
        <div class="ed-list-item">
          <div class="ed-list-item-header">
            <span class="ed-list-num">${esc(labelFromItem(item, i))}</span>
            <button class="ed-btn-remove" data-action="${removeAction}" data-index="${i}" title="Remover">Remover</button>
          </div>
        </div>
      `).join('')
    : `<p class="ed-empty">Nenhum item ainda. Clique em "+ Adicionar" para começar.</p>`;

  return listGroup({
    title,
    addAction,
    listId: `${addAction}-manager`,
    itemsHtml: content,
    emptyText: 'Nenhum item.',
  });
}

function renderFaq() {
  const items = config.pages.faq.content.items ?? [];
  const manager = renderListManager({
    title: 'Gerenciar Perguntas',
    addAction: 'add-faq',
    removeAction: 'remove-faq',
    items,
    labelFromItem: (item, i) => item.question?.trim() ? `Pergunta ${i + 1}: ${item.question}` : `Pergunta ${i + 1}`,
  });
  const typography = renderLinkedTypographyEditor({
    title: 'Tipografia da FAQ',
    hint: 'Fluxo completo: edite perguntas/respostas e tipografia no mesmo bloco.',
    mappings: [...TYPOGRAPHY_LINKED_FAQ, ...buildFaqItemMappings(items)],
  });
  return manager + typography;
}

function renderHistoria() {
  const chapters = config.pages.historia.content.chapters ?? [];
  const manager = renderListManager({
    title: 'Gerenciar Capítulos',
    addAction: 'add-historia',
    removeAction: 'remove-historia',
    items: chapters,
    labelFromItem: (item, i) => item.title?.trim() ? `Capítulo ${i + 1}: ${item.title}` : `Capítulo ${i + 1}`,
  });
  const typography = renderLinkedTypographyEditor({
    title: 'Tipografia da Nossa História',
    hint: 'Fluxo completo: edite capítulos e tipografia no mesmo bloco.',
    mappings: [...TYPOGRAPHY_LINKED_HISTORIA, ...buildHistoriaMappings(chapters)],
  });
  return manager + typography;
}

function renderHospedagem() {
  const hotels = config.pages.hospedagem.content.hotels ?? [];
  const restaurants = config.pages.hospedagem.content.restaurants ?? [];

  const hotelManager = renderListManager({
    title: 'Gerenciar Hotéis',
    addAction: 'add-hotels',
    removeAction: 'remove-hotels',
    items: hotels,
    labelFromItem: (item, i) => item.name?.trim() ? `Hotel ${i + 1}: ${item.name}` : `Hotel ${i + 1}`,
  });
  const restaurantManager = renderListManager({
    title: 'Gerenciar Restaurantes',
    addAction: 'add-restaurants',
    removeAction: 'remove-restaurants',
    items: restaurants,
    labelFromItem: (item, i) => item.name?.trim() ? `Restaurante ${i + 1}: ${item.name}` : `Restaurante ${i + 1}`,
  });
  const typography = renderLinkedTypographyEditor({
    title: 'Tipografia da Hospedagem',
    hint: 'Fluxo completo: edite hotéis/restaurantes e tipografia no mesmo bloco.',
    mappings: [...TYPOGRAPHY_LINKED_HOSPEDAGEM, ...buildHospedagemMappings(hotels, restaurants)],
  });
  return hotelManager + restaurantManager + typography;
}

function galleryItemHtml(item, i) {
  return `
    <div class="ed-list-item">
      <div class="ed-list-item-header">
        <span class="ed-list-num">Foto ${i + 1}</span>
        <button class="ed-btn-remove" data-action="remove-gallery" data-index="${i}" title="Remover">Remover</button>
      </div>
      <div class="ed-field">
        <label class="ed-label">Caminho da imagem</label>
        <input class="ed-input" type="text"
          data-list="historia-gallery" data-idx="${i}" data-key="src"
          value="${esc(item.src)}" placeholder="assets/images/gallery/foto1.png">
      </div>
      <div class="ed-field">
        <label class="ed-label">Texto alternativo (alt)</label>
        <input class="ed-input" type="text"
          data-list="historia-gallery" data-idx="${i}" data-key="alt"
          value="${esc(item.alt)}" placeholder="Descrição da foto">
      </div>
    </div>`;
}

function renderMapaGaleria() {
  const gallery = config.pages.historia.content.gallery ?? [];
  const galleryItems = gallery.length
    ? gallery.map((item, i) => galleryItemHtml(item, i)).join('')
    : '<p class="ed-empty">Nenhuma foto na galeria. Clique em "+ Adicionar".</p>';

  const mapGroup = group('Mapa da Hospedagem', `
    ${fieldInput({ label: 'Mapa habilitado (true/false)', path: 'event.mapEnabled', placeholder: 'true', hint: 'Use true para exibir o mapa na página hospedagem.', cast: 'boolean' })}
    ${fieldInputRow([
      { label: 'Latitude', path: 'event.venueCoordinates.lat', placeholder: '-23.8545', inputType: 'number', cast: 'number' },
      { label: 'Longitude', path: 'event.venueCoordinates.lng', placeholder: '-46.5797', inputType: 'number', cast: 'number' },
    ])}
    ${fieldInput({ label: 'Endereço do local', path: 'event.venueAddress', placeholder: 'Rodovia Anchieta, SP-150, km 28, São Bernardo do Campo - SP' })}
    ${fieldInput({ label: 'Link Google Maps', path: 'event.mapsLink', placeholder: 'https://maps.google.com/...', inputType: 'url' })}
  `);

  const galleryGroup = listGroup({
    title: 'Galeria da página Nossa História',
    addAction: 'add-gallery',
    listId: 'gallery-list',
    itemsHtml: galleryItems,
    emptyText: 'Nenhuma foto.',
  }) + group('Como usar a galeria', `
    <p class="ed-theme-hint">Todas as fotos da galeria agora ficam dentro do próprio site.json, junto com o restante da configuração. Basta informar o caminho da imagem e o texto alternativo.</p>
  `);

  return mapGroup + galleryGroup;
}

function renderPresente() {
  return group('Pix', `
    ${fieldInput({ label: 'Chave Pix', path: 'gift.pixKey', placeholder: 'CHAVE_PIX_OU_CODIGO_COPIA_E_COLA_AQUI' })}
    ${fieldInput({ label: 'Imagem QR Code do Pix', path: 'gift.pixQrImage', placeholder: 'assets/images/icons/pix-placeholder.svg' })}
    ${fieldInput({ label: 'Label Pix (copia e cola)', path: 'texts.giftPixCopyLabel', placeholder: 'Pix copia e cola' })}
    ${fieldInput({ label: 'Texto botão copiar Pix', path: 'texts.giftPixCopyButton', placeholder: 'Copiar código Pix' })}
  `) + group('Pagamento por cartão', `
    ${fieldInput({ label: 'Cartão habilitado (true/false)', path: 'gift.cardPaymentEnabled', placeholder: 'false', cast: 'boolean', hint: 'Quando false, o bloco de cartão fica oculto no site.' })}
    ${fieldInput({ label: 'Link de pagamento', path: 'gift.cardPaymentLink', placeholder: 'https://pagamento.exemplo.com/link-do-casal', inputType: 'url', hint: 'Aceita apenas URL válida (http/https).' })}
    ${fieldInput({ label: 'Tag do bloco', path: 'texts.giftCardTag', placeholder: 'Pagamento por cartão' })}
    ${fieldInput({ label: 'Título do bloco', path: 'texts.giftCardTitle', placeholder: 'Pagamento por cartão' })}
    ${fieldTextarea({ label: 'Descrição do bloco', path: 'texts.giftCardBody', placeholder: 'Escolha a melhor forma para nos presentear com carinho.' })}
    ${fieldInput({ label: 'Texto do botão de cartão', path: 'texts.giftCardPlaceholder', placeholder: 'Pagar com cartão', hint: 'Esse texto vira o botão clicável quando o cartão estiver habilitado.' })}
  `);
}

function renderMensagem() {
  return group('Card em Extras', `
    ${fieldInput({ label: 'Página habilitada (true/false)', path: 'pages.mensagem.enabled', placeholder: 'true', cast: 'boolean', hint: 'Quando false, o card de Mensagem não aparece no bloco de extras.' })}
    ${fieldInput({ label: 'Título do card', path: 'pages.mensagem.cardLabel', placeholder: 'Mensagem ao Casal' })}
    ${fieldInput({ label: 'Hint do card', path: 'pages.mensagem.cardHint', placeholder: 'Deixar recado' })}
  `) + group('Conteúdo da página', `
    ${fieldInput({ label: 'Tag da seção', path: 'pages.mensagem.content.tag', placeholder: 'Mensagem ao Casal' })}
    ${fieldInput({ label: 'Título principal', path: 'pages.mensagem.content.title', placeholder: 'Deixe uma mensagem de carinho' })}
    ${fieldTextarea({ label: 'Introdução', path: 'pages.mensagem.content.intro', placeholder: 'Seu recado vai deixar esse momento ainda mais especial para nós.' })}
  `) + group('Formulário', `
    ${fieldInput({ label: 'Título do formulário', path: 'pages.mensagem.content.formTitle', placeholder: 'Escreva para nós' })}
    ${fieldTextarea({ label: 'Subtítulo do formulário', path: 'pages.mensagem.content.formSubtitle', placeholder: 'Você pode deixar seu nome e uma mensagem que prepararemos para guardar com carinho.' })}
    ${fieldInput({ label: 'Label de nome', path: 'pages.mensagem.content.nameLabel', placeholder: 'Seu nome (opcional)' })}
    ${fieldInput({ label: 'Label da mensagem', path: 'pages.mensagem.content.messageLabel', placeholder: 'Sua mensagem' })}
    ${fieldInput({ label: 'Placeholder do nome', path: 'pages.mensagem.content.namePlaceholder', placeholder: 'Como podemos te chamar?' })}
    ${fieldTextarea({ label: 'Placeholder da mensagem', path: 'pages.mensagem.content.messagePlaceholder', placeholder: 'Escreva aqui sua mensagem de carinho...' })}
    ${fieldInput({ label: 'Texto do botão', path: 'pages.mensagem.content.submitLabel', placeholder: 'Preparar envio no WhatsApp' })}
    ${fieldTextarea({ label: 'Mensagem de sucesso', path: 'pages.mensagem.content.successMessage', placeholder: 'Mensagem preparada. Abrimos o WhatsApp para você finalizar o envio.' })}
    ${fieldTextarea({ label: 'Mensagem de erro', path: 'pages.mensagem.content.errorMessage', placeholder: 'Não foi possível preparar o envio. Tente novamente.' })}
  `) + group('Navegação', `
    ${fieldInput({ label: 'Texto do botão voltar ao início', path: 'texts.backToHomeButton', placeholder: 'Voltar para o início' })}
    ${fieldInput({ label: 'Texto do botão voltar para extras', path: 'texts.backToExtrasButton', placeholder: 'Voltar para página principal' })}
  `);
}

function renderMusica() {
  return group('Card em Extras', `
    ${fieldInput({ label: 'Página habilitada (true/false)', path: 'pages.musica.enabled', placeholder: 'true', cast: 'boolean', hint: 'Quando false, o card de Música não aparece no bloco de extras.' })}
    ${fieldInput({ label: 'Título do card', path: 'pages.musica.cardLabel', placeholder: 'Sugerir Música' })}
    ${fieldInput({ label: 'Hint do card', path: 'pages.musica.cardHint', placeholder: 'Para a festa' })}
  `) + group('Conteúdo da página', `
    ${fieldInput({ label: 'Tag da seção', path: 'pages.musica.content.tag', placeholder: 'Sugestão de Música' })}
    ${fieldInput({ label: 'Título principal', path: 'pages.musica.content.title', placeholder: 'Qual música não pode faltar?' })}
    ${fieldTextarea({ label: 'Introdução', path: 'pages.musica.content.intro', placeholder: 'Sugira uma música para tocar na nossa festa e ajudar a montar a trilha desse dia.' })}
  `) + group('Formulário', `
    ${fieldInput({ label: 'Título do formulário', path: 'pages.musica.content.formTitle', placeholder: 'Envie sua sugestão' })}
    ${fieldTextarea({ label: 'Subtítulo do formulário', path: 'pages.musica.content.formSubtitle', placeholder: 'Compartilhe ao menos o nome da música. Se quiser, inclua artista e observações.' })}
    ${fieldInput({ label: 'Label de nome', path: 'pages.musica.content.nameLabel', placeholder: 'Seu nome (opcional)' })}
    ${fieldInput({ label: 'Label da música', path: 'pages.musica.content.songLabel', placeholder: 'Nome da música' })}
    ${fieldInput({ label: 'Label do artista', path: 'pages.musica.content.artistLabel', placeholder: 'Artista (opcional)' })}
    ${fieldInput({ label: 'Label de observações', path: 'pages.musica.content.notesLabel', placeholder: 'Observações (opcional)' })}
    ${fieldInput({ label: 'Placeholder do nome', path: 'pages.musica.content.namePlaceholder', placeholder: 'Como podemos te chamar?' })}
    ${fieldInput({ label: 'Placeholder da música', path: 'pages.musica.content.songPlaceholder', placeholder: 'Ex: Velha Infância' })}
    ${fieldInput({ label: 'Placeholder do artista', path: 'pages.musica.content.artistPlaceholder', placeholder: 'Ex: Tribalistas' })}
    ${fieldTextarea({ label: 'Placeholder de observações', path: 'pages.musica.content.notesPlaceholder', placeholder: 'Diga por que essa música é especial...' })}
    ${fieldInput({ label: 'Texto do botão', path: 'pages.musica.content.submitLabel', placeholder: 'Preparar envio no WhatsApp' })}
    ${fieldTextarea({ label: 'Mensagem de sucesso', path: 'pages.musica.content.successMessage', placeholder: 'Sugestão preparada. Abrimos o WhatsApp para você finalizar o envio.' })}
    ${fieldTextarea({ label: 'Mensagem de erro', path: 'pages.musica.content.errorMessage', placeholder: 'Não foi possível preparar o envio. Tente novamente.' })}
  `) + group('Navegação', `
    ${fieldInput({ label: 'Texto do botão voltar ao início', path: 'texts.backToHomeButton', placeholder: 'Voltar para o início' })}
    ${fieldInput({ label: 'Texto do botão voltar para extras', path: 'texts.backToExtrasButton', placeholder: 'Voltar para página principal' })}
  `);
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
      allColors: data.colors ?? {},
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

  const activeTheme = themeCatalog.find((theme) => theme.path === config.activeTheme) || themeCatalog[0] || { allColors: {} };

  function getColorHint({ key, description, aliases = [] }) {
    const overrideValue = getPath(config, `themeOverrides.colors.${key}`);
    const aliasKey = aliases.find((alias) => String(getPath(config, `themeOverrides.colors.${alias}`) ?? '').trim());
    const aliasValue = aliasKey ? getPath(config, `themeOverrides.colors.${aliasKey}`) : '';
    const themeValue = activeTheme.allColors?.[key] ?? '';

    const currentValue = String(overrideValue ?? '').trim()
      || String(aliasValue ?? '').trim()
      || String(themeValue ?? '').trim()
      || 'sem valor definido';

    const source = String(overrideValue ?? '').trim()
      ? `override (${key})`
      : (String(aliasValue ?? '').trim() ? `override legado (${aliasKey})` : 'tema base');

    return `${description} | Atual: ${currentValue} | Origem: ${source}`;
  }

  const colorsSection = group('Cores (override no site.json)', `
    <p class="ed-theme-hint">Esses campos sobrescrevem apenas as cores do tema ativo. Cada campo mostra para que serve e qual valor está valendo agora.</p>
    <div class="ed-subsection">
      <h4 class="ed-subtitle">Base visual e textos</h4>
      ${fieldInputRow([
        { label: 'Fundo geral da página', path: 'themeOverrides.colors.background', placeholder: '#0f0f12', hint: getColorHint({ key: 'background', description: 'Cor principal do fundo do site inteiro' }) },
        { label: 'Superfície de cards e caixas', path: 'themeOverrides.colors.surface', placeholder: '#1b1b21', hint: getColorHint({ key: 'surface', description: 'Fundos de blocos como cards e painéis' }) },
        { label: 'Cor de destaque principal', path: 'themeOverrides.colors.primary', placeholder: '#d4af37', hint: getColorHint({ key: 'primary', description: 'Botões, destaques e elementos de chamada' }) },
      ])}
      ${fieldInputRow([
        { label: 'Destaque suave', path: 'themeOverrides.colors.primarySoft', placeholder: 'rgba(212, 175, 55, 0.14)', hint: getColorHint({ key: 'primarySoft', description: 'Variação suave da cor de destaque' }) },
        { label: 'Texto principal', path: 'themeOverrides.colors.text', placeholder: '#f5f2ea', hint: getColorHint({ key: 'text', description: 'Texto mais importante (títulos e conteúdos)' }) },
        { label: 'Texto secundário', path: 'themeOverrides.colors.textMuted', placeholder: '#d3c9b2', hint: getColorHint({ key: 'textMuted', description: 'Texto auxiliar e informações secundárias' }) },
      ])}
      ${fieldInputRow([
        { label: 'Texto de apoio discreto', path: 'themeOverrides.colors.textFaint', placeholder: '#aaa08a', hint: getColorHint({ key: 'textFaint', description: 'Texto mais sutil, notas e conteúdos menos importantes' }) },
        { label: 'Borda padrão', path: 'themeOverrides.colors.border', placeholder: 'rgba(255, 255, 255, 0.22)', hint: getColorHint({ key: 'border', description: 'Bordas principais de cards, inputs e divisores' }) },
        { label: 'Borda suave', path: 'themeOverrides.colors.borderSoft', placeholder: 'rgba(255, 255, 255, 0.12)', hint: getColorHint({ key: 'borderSoft', description: 'Bordas mais leves e discretas' }) },
      ])}
      ${fieldInputRow([
        { label: 'Escurecimento de fundo em sobreposição', path: 'themeOverrides.colors.overlayBackdrop', placeholder: 'rgba(0, 0, 0, 0.7)', hint: getColorHint({ key: 'overlayBackdrop', description: 'Sombra escura por trás de modais e camadas sobrepostas' }) },
        { label: 'Fundo de foco do input', path: 'themeOverrides.colors.inputFocusBg', placeholder: 'rgba(212, 175, 55, 0.08)', hint: getColorHint({ key: 'inputFocusBg', description: 'Cor de realce quando o campo de formulário recebe foco', aliases: ['inputBorderFocus'] }) },
        { label: 'Linha de grade de fundo', path: 'themeOverrides.colors.pageGridLine', placeholder: 'rgba(255, 255, 255, 0.06)', hint: getColorHint({ key: 'pageGridLine', description: 'Linhas decorativas da textura de fundo (quando usadas)' }) },
      ])}
    </div>
    <div class="ed-subsection">
      <h4 class="ed-subtitle">Botão de áudio</h4>
      ${fieldInputRow([
        { label: 'Fundo do botão de áudio', path: 'themeOverrides.colors.audioPanelBg', placeholder: 'rgba(16, 16, 18, 0.72)', hint: getColorHint({ key: 'audioPanelBg', description: 'Fundo do botão flutuante de áudio', aliases: ['audioButtonBg'] }) },
        { label: 'Fundo ao passar o mouse', path: 'themeOverrides.colors.audioPanelHoverBg', placeholder: 'rgba(24, 24, 26, 0.9)', hint: getColorHint({ key: 'audioPanelHoverBg', description: 'Cor do botão de áudio no hover' }) },
        { label: 'Borda do botão de áudio', path: 'themeOverrides.colors.audioPanelBorder', placeholder: 'rgba(255, 255, 255, 0.28)', hint: getColorHint({ key: 'audioPanelBorder', description: 'Contorno do botão de áudio', aliases: ['audioButtonBorder'] }) },
      ])}
    </div>
  `);

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
    ${colorsSection}
    ${typographySection}`;
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'casal',      label: 'Casal & Evento',    render: renderCasal },
  { id: 'textos',     label: 'Textos Principais', render: renderTextos },
  { id: 'faq',        label: 'FAQ',               render: renderFaq },
  { id: 'historia',   label: 'Nossa História',    render: renderHistoria },
  { id: 'hospedagem', label: 'Hospedagem',        render: renderHospedagem },
  { id: 'mensagem',   label: 'Mensagem ao Casal', render: renderMensagem },
  { id: 'musica',     label: 'Sugestão de Música', render: renderMusica },
  { id: 'mapa-galeria', label: 'Mapa & Galeria',  render: renderMapaGaleria },
  { id: 'presente',   label: 'Presente',          render: renderPresente },
  { id: 'tema',       label: 'Tema',              render: renderTema, async: true },
];

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderPreviewItems(items) {
  if (!items.length) {
    return '<p class="ed-preview-empty">Sem conteúdo para pré-visualizar neste bloco.</p>';
  }

  return `<ul class="ed-preview-list">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function getActiveTabPreviewHtml() {
  switch (activeTab) {
    case 'casal':
      return `
        <h3 class="ed-preview-title">${esc(getPath(config, 'couple.names') || 'Siannah & Diego')}</h3>
        <p class="ed-preview-text">${esc(getPath(config, 'couple.subtitle') || '')}</p>
        <p class="ed-preview-meta">${esc(getPath(config, 'event.displayDate') || '')} • ${esc(getPath(config, 'event.time') || '')}</p>
        <p class="ed-preview-meta">${esc(getPath(config, 'event.locationName') || '')} — ${esc(getPath(config, 'event.locationCity') || '')}</p>
      `;
    case 'textos':
      return `
        <h3 class="ed-preview-title">${esc(getPath(config, 'texts.detailsTitle') || 'Prévia de textos')}</h3>
        <p class="ed-preview-text">${esc(getPath(config, 'texts.detailsIntro') || '')}</p>
        <p class="ed-preview-meta">RSVP: ${esc(getPath(config, 'texts.rsvpTitle') || '')}</p>
      `;
    case 'faq': {
      const items = (config.pages?.faq?.content?.items ?? []).map((item) => item.question || '').filter(Boolean);
      return `
        <h3 class="ed-preview-title">${esc(getPath(config, 'pages.faq.content.title') || 'FAQ')}</h3>
        <p class="ed-preview-text">${esc(getPath(config, 'pages.faq.content.intro') || '')}</p>
        ${renderPreviewItems(items)}
      `;
    }
    case 'historia': {
      const chapters = (config.pages?.historia?.content?.chapters ?? []).map((item) => item.title || '').filter(Boolean);
      return `
        <h3 class="ed-preview-title">${esc(getPath(config, 'pages.historia.content.title') || 'Nossa História')}</h3>
        <p class="ed-preview-text">${esc(getPath(config, 'pages.historia.content.intro') || '')}</p>
        ${renderPreviewItems(chapters)}
      `;
    }
    case 'hospedagem': {
      const hotels = (config.pages?.hospedagem?.content?.hotels ?? []).map((item) => item.name || '').filter(Boolean);
      const restaurants = (config.pages?.hospedagem?.content?.restaurants ?? []).map((item) => item.name || '').filter(Boolean);
      return `
        <h3 class="ed-preview-title">${esc(getPath(config, 'pages.hospedagem.content.title') || 'Hospedagem')}</h3>
        <p class="ed-preview-text">${esc(getPath(config, 'pages.hospedagem.content.intro') || '')}</p>
        <h4 class="ed-preview-subtitle">Hotéis</h4>
        ${renderPreviewItems(hotels)}
        <h4 class="ed-preview-subtitle">Restaurantes</h4>
        ${renderPreviewItems(restaurants)}
      `;
    }
    case 'mensagem': {
      return `
        <h3 class="ed-preview-title">${esc(getPath(config, 'pages.mensagem.content.title') || 'Mensagem ao Casal')}</h3>
        <p class="ed-preview-text">${esc(getPath(config, 'pages.mensagem.content.intro') || '')}</p>
        <p class="ed-preview-meta">Card: ${esc(getPath(config, 'pages.mensagem.cardLabel') || '')}</p>
        <p class="ed-preview-meta">Botão: ${esc(getPath(config, 'pages.mensagem.content.submitLabel') || '')}</p>
      `;
    }
    case 'musica': {
      return `
        <h3 class="ed-preview-title">${esc(getPath(config, 'pages.musica.content.title') || 'Sugestão de Música')}</h3>
        <p class="ed-preview-text">${esc(getPath(config, 'pages.musica.content.intro') || '')}</p>
        <p class="ed-preview-meta">Card: ${esc(getPath(config, 'pages.musica.cardLabel') || '')}</p>
        <p class="ed-preview-meta">Campo principal: ${esc(getPath(config, 'pages.musica.content.songLabel') || '')}</p>
      `;
    }
    case 'mapa-galeria': {
      const mapEnabled = Boolean(getPath(config, 'event.mapEnabled'));
      const gallerySize = (config.pages?.historia?.content?.gallery ?? []).length;
      return `
        <h3 class="ed-preview-title">Mapa & Galeria</h3>
        <p class="ed-preview-meta">Mapa: ${mapEnabled ? 'habilitado' : 'desabilitado'}</p>
        <p class="ed-preview-meta">Fotos da galeria: ${gallerySize}</p>
        <p class="ed-preview-text">${esc(getPath(config, 'event.venueAddress') || '')}</p>
      `;
    }
    case 'presente': {
      const cardEnabled = Boolean(getPath(config, 'gift.cardPaymentEnabled'));
      const cardLabel = getPath(config, 'texts.giftCardPlaceholder') || 'Pagar com cartão';
      const cardLink = getPath(config, 'gift.cardPaymentLink') || '';
      return `
        <h3 class="ed-preview-title">${esc(getPath(config, 'texts.giftTitle') || 'Para nos presentear')}</h3>
        <p class="ed-preview-text">${esc(getPath(config, 'texts.giftIntro') || '')}</p>
        <p class="ed-preview-meta">Pix: ${esc(getPath(config, 'gift.pixKey') || 'não informado')}</p>
        ${cardEnabled ? `<a class="ed-preview-link" href="${esc(cardLink)}" target="_blank" rel="noopener noreferrer">${esc(cardLabel)}</a>` : '<p class="ed-preview-muted">Cartão desabilitado: bloco oculto no site.</p>'}
      `;
    }
    case 'tema':
      return `
        <h3 class="ed-preview-title">Tema ativo</h3>
        <p class="ed-preview-meta">${esc(config.activeTheme || '')}</p>
        <p class="ed-preview-meta">Overrides de cores preenchidos: ${Object.entries(getPath(config, 'themeOverrides.colors') || {}).filter(([, value]) => String(value || '').trim()).length}</p>
        <p class="ed-preview-muted">Prévia simplificada desta aba. Use os cards de tema para o preview visual completo.</p>
      `;
    default:
      return '<p class="ed-preview-empty">Sem prévia disponível para esta aba.</p>';
  }
}

function renderActivePreview() {
  const panel = document.getElementById('tab-preview-content');
  const title = document.getElementById('tab-preview-title');
  if (!panel || !title) return;

  const tab = TABS.find((item) => item.id === activeTab);
  title.textContent = tab ? `Prévia: ${tab.label}` : 'Prévia';
  panel.innerHTML = getActiveTabPreviewHtml();
}

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
    renderActivePreview();
    tab.render().then(html => {
      content.innerHTML = `<div class="ed-section">${html}</div>`;
      renderActivePreview();
    });
  } else {
    content.innerHTML = `<div class="ed-section">${tab.render()}</div>`;
    renderActivePreview();
  }
}

// ── Event binding ─────────────────────────────────────────────────────────────

function bindContentEvents(root) {
  if (root.dataset.eventsBound === 'true') {
    return;
  }
  root.dataset.eventsBound = 'true';

  // Flat field changes
  root.addEventListener('input', (e) => {
    const { path, list, idx, key, cast } = e.target.dataset;
    if (path) {
      let value = e.target.value;
      if (cast === 'number') {
        value = value.trim() === '' ? '' : Number(value);
      }
      if (cast === 'boolean') {
        const normalized = String(value).trim().toLowerCase();
        value = normalized === 'true';
      }
      setConfigValue(path, value);
      refreshTypographyPreviews(root);
      renderActivePreview();
      markDirty();
      debouncedRevalidate();
    }
    if (list !== undefined && idx !== undefined && key !== undefined) {
      listArray(list)[parseInt(idx)][key] = e.target.value;
      refreshTypographyPreviews(root);
      renderActivePreview();
      markDirty();
      debouncedRevalidate();
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
      debouncedRevalidate();
    }
  });
}

function listArray(name) {
  return {
    faq:         config.pages.faq.content.items,
    historia:    config.pages.historia.content.chapters,
    'historia-gallery': config.pages.historia.content.gallery,
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
    case 'add-gallery':
      config.pages.historia.content.gallery.push({ src: '', alt: '' }); break;
    case 'remove-gallery':
      config.pages.historia.content.gallery.splice(index, 1); break;
    default: return;
  }
  markDirty();
  renderActiveTab();
  debouncedRevalidate();
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  const tabContent = document.getElementById('tab-content');
  bindContentEvents(tabContent);

  // Tab navigation
  document.getElementById('tab-bar').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn && btn.dataset.tab !== activeTab) {
      activeTab = btn.dataset.tab;
      renderActiveTab();
      revalidate();
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
