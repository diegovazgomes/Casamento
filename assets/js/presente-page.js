import { markContentReady } from './loading-screen.js';
import { escapeHtml } from './utils.js';

const DEFAULT_HONEYMOON_ITEMS = [
  { id: 'taxas-embarque', name: 'Taxas de Embarque', desc: 'Ajuda com taxas e bagagens da viagem.', amount: 140.00, category: 'Lua de Mel', icon: '🧳' },
  { id: 'traslado-aeroporto', name: 'Traslado Aeroporto-Hotel', desc: 'Transporte seguro na chegada e saída.', amount: 200.00, category: 'Lua de Mel', icon: '🚕' },
  { id: 'jantar-romantico', name: 'Jantar Romântico', desc: 'Um jantar especial a dois na viagem.', amount: 299.00, category: 'Lua de Mel', icon: '🍽️' },
  { id: 'passeio-barco', name: 'Passeio de Barco', desc: 'Experiência inesquecível em alto-mar.', amount: 317.00, category: 'Lua de Mel', icon: '⛵' },
  { id: 'jantar-celebracao', name: 'Jantar de Celebração', desc: 'Noite especial para celebrar esse momento.', amount: 390.00, category: 'Lua de Mel', icon: '🥂' },
  { id: 'spa-casal', name: 'Spa para o Casal', desc: 'Momento de relaxamento durante a lua de mel.', amount: 470.00, category: 'Lua de Mel', icon: '🧖' },
  { id: 'hospedagem-1-noite', name: 'Hospedagem de 1 Noite', desc: 'Contribuição para uma noite no hotel.', amount: 560.00, category: 'Lua de Mel', icon: '🏨' },
  { id: 'tour-privativo', name: 'Tour Privativo', desc: 'Um dia de passeio com guia local.', amount: 650.00, category: 'Lua de Mel', icon: '🗺️' },
  { id: 'ensaio-fotografico', name: 'Ensaio Fotográfico', desc: 'Registro do nosso começo em viagem.', amount: 740.00, category: 'Lua de Mel', icon: '📸' },
  { id: 'experiencia-premium', name: 'Experiência Premium', desc: 'Uma experiência única na viagem.', amount: 820.00, category: 'Lua de Mel', icon: '✨' },
  { id: 'passagem-aerea-casal', name: 'Passagem Aérea do Casal', desc: 'Contribuição para nossas passagens de ida.', amount: 849.00, category: 'Lua de Mel', icon: '✈️' },
  { id: 'cota-lua-de-mel-completa', name: 'Cota Lua de Mel Completa', desc: 'Contribuição para tornar essa viagem perfeita.', amount: 999.00, category: 'Lua de Mel', icon: '💛' },
];

const DEFAULT_HOUSEHOLD_ITEMS = [
  { id: 'jogo-panelas', name: 'Jogo de Panelas', desc: 'Para preparar muitas receitas no novo lar.', amount: 220.00, category: 'Casa', icon: '🍳' },
  { id: 'airfryer', name: 'Airfryer', desc: 'Praticidade para o dia a dia da casa.', amount: 380.00, category: 'Casa', icon: '🍟' },
  { id: 'liquidificador', name: 'Liquidificador', desc: 'Essencial para sucos, vitaminas e receitas.', amount: 190.00, category: 'Casa', icon: '🥤' },
  { id: 'cafeteira', name: 'Cafeteira', desc: 'Para começar o dia com energia e carinho.', amount: 260.00, category: 'Casa', icon: '☕' },
  { id: 'jogo-cama', name: 'Jogo de Cama', desc: 'Conforto para noites ainda mais especiais.', amount: 210.00, category: 'Casa', icon: '🛏️' },
  { id: 'jogo-toalhas', name: 'Jogo de Toalhas', desc: 'Um mimo útil para o enxoval.', amount: 130.00, category: 'Casa', icon: '🧺' },
  { id: 'faqueiro', name: 'Faqueiro', desc: 'Para receber visitas com elegância.', amount: 170.00, category: 'Casa', icon: '🍴' },
  { id: 'aparelho-jantar', name: 'Aparelho de Jantar', desc: 'Para celebrar refeições em família.', amount: 320.00, category: 'Casa', icon: '🍽️' },
  { id: 'aspirador', name: 'Aspirador de Pó', desc: 'Mais praticidade na rotina da limpeza.', amount: 450.00, category: 'Casa', icon: '🧹' },
  { id: 'microondas', name: 'Micro-ondas', desc: 'Agilidade para refeições e aquecimentos.', amount: 590.00, category: 'Casa', icon: '🔥' },
  { id: 'rack-sala', name: 'Rack para Sala', desc: 'Um toque especial para o cantinho da sala.', amount: 720.00, category: 'Casa', icon: '🛋️' },
  { id: 'geladeira', name: 'Cota Geladeira', desc: 'Contribuição para um item essencial da casa.', amount: 990.00, category: 'Casa', icon: '🧊' },
];

const DEFAULT_CATALOGS = {
  honeymoon: {
    title: 'Lista de Lua de Mel',
    subtitle: 'Sugestões para celebrar nossa primeira viagem como casados.',
    items: DEFAULT_HONEYMOON_ITEMS,
  },
  home: {
    title: 'Lista para Casa',
    subtitle: 'Sugestões para montar e deixar nosso novo lar ainda mais especial.',
    items: DEFAULT_HOUSEHOLD_ITEMS,
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
  },
};

let GIFT_ITEMS = DEFAULT_HONEYMOON_ITEMS;
let ACTIVE_CATALOG_TITLE = 'Lista de Lua de Mel';
let ACTIVE_CATALOG_SUBTITLE = '';

function formatBRL(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return 'R$ 0,00';
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function sanitizeCatalogItems(items = [], fallbackCategory = 'Lua de Mel') {
  return items
    .filter((item) => item && item.enabled !== false)
    .map((item, index) => {
      const amount = Number(item.amount ?? item.suggestedAmount ?? 0);
      const normalizedAmount = Number.isFinite(amount) ? amount : 0;
      return {
        id: String(item.id ?? `item-${index + 1}`),
        name: String(item.name ?? item.title ?? `Presente ${index + 1}`),
        desc: String(item.desc ?? item.description ?? ''),
        amount: normalizedAmount,
        price: formatBRL(normalizedAmount),
        category: String(item.category ?? fallbackCategory),
        icon: String(item.icon ?? '💛')
      };
    });
}

function resolveActiveCatalog(giftConfig = {}) {
  const catalogsRoot = giftConfig?.catalogs;
  const lists = catalogsRoot?.lists;
  const configuredActiveKey = giftConfig?.activeCatalogKey || catalogsRoot?.activeKey || giftConfig?.catalog?.key;

  // gift.catalog is set by mapGiftConfig and always carries authoritative JSONB items.
  // Prefer it when items exist — list entries in catalogs.lists may carry stale row items.
  if (giftConfig?.catalog && typeof giftConfig.catalog === 'object') {
    const cat = giftConfig.catalog;
    if (Array.isArray(cat.items) && cat.items.length > 0) {
      return { catalog: cat, catalogKey: configuredActiveKey || cat.key || 'honeymoon' };
    }
  }

  // Fallback: resolve from catalogs.lists (metadata: key, title, subtitle, enabled)
  if (lists && typeof lists === 'object' && !Array.isArray(lists)) {
    const entries = Object.entries(lists).filter(([, value]) => value && typeof value === 'object');

    if (entries.length > 0) {
      const byKey = configuredActiveKey && lists[configuredActiveKey] ? [configuredActiveKey, lists[configuredActiveKey]] : null;
      const enabledEntry = entries.find(([, value]) => value.enabled !== false);
      const selectedEntry = byKey || enabledEntry || entries[0];
      const [catalogKey, catalog] = selectedEntry;
      return { catalog, catalogKey };
    }
  }

  // Last resort: use gift.catalog even if items are empty
  if (giftConfig?.catalog && typeof giftConfig.catalog === 'object') {
    const cat = giftConfig.catalog;
    return { catalog: cat, catalogKey: configuredActiveKey || cat.key || 'honeymoon' };
  }

  return { catalog: DEFAULT_CATALOGS.honeymoon, catalogKey: 'honeymoon' };
}

function resolveCardPaymentUrl(baseUrl) {
  const fallbackUrl = '#';
  if (!baseUrl) return fallbackUrl;

  try {
    let urlToProcess = baseUrl;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      urlToProcess = 'https://' + baseUrl;
    }

    return new URL(urlToProcess).toString();
  } catch {
    return fallbackUrl;
  }
}

/* ── Renderiza os cards ──────────────────────────────────────────────── */
function renderGiftList(pixKey, qrSrc, paymentBaseUrl) {
  const grid = document.getElementById('giftGridList');
  if (!grid) return;

  const sortedItems = [...GIFT_ITEMS].sort((a, b) => (a.amount || 0) - (b.amount || 0));
  grid.innerHTML = sortedItems.map((item) => {
    const itemPrice = item.price || formatBRL(item.amount);
    return `
    <article
      class="gift-item"
      role="button"
      tabindex="0"
      aria-label="Presentear com ${escapeHtml(item.name)} — ${escapeHtml(itemPrice)}"
      data-id="${escapeHtml(item.id)}"
    >
      <div class="gift-item-img-wrap">
        <div class="gift-item-icon">${escapeHtml(item.icon)}</div>
        <span class="gift-item-badge">${escapeHtml(item.category)}</span>
      </div>
      <div class="gift-item-body">
        <div class="gift-item-name">${escapeHtml(item.name)}</div>
        <div class="gift-item-price">${escapeHtml(itemPrice)}</div>
        <div class="gift-item-price-hint">valor sugerido</div>
        <div class="gift-item-btn">
          <span class="gift-item-btn-label">Presentear</span>
          <span class="gift-item-btn-arrow">→</span>
        </div>
      </div>
    </article>
  `;
  }).join('');

  /* Eventos nos cards */
  grid.querySelectorAll('.gift-item').forEach(card => {
    const open = () => openModal(card.dataset.id, pixKey, qrSrc, paymentBaseUrl);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
  });
}

/* ── Modal ───────────────────────────────────────────────────────────── */
let _pixKey = '';
let _qrSrc  = '';
let CARD_ENABLED = true;

function openModal(itemId, pixKey, qrSrc, paymentBaseUrl) {
  const item = GIFT_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  _pixKey = pixKey;
  _qrSrc  = qrSrc;

  document.getElementById('giftModalItemName').textContent  = item.name;
  document.getElementById('giftModalItemPrice').textContent = `${item.price || formatBRL(item.amount)} (sugerido)`;
  document.getElementById('giftModalPixKey').textContent    = pixKey || 'Chave Pix não configurada';
  document.getElementById('giftModalQrImg').src = qrSrc || 'assets/images/icons/pix-placeholder.svg';

  /* Link para presentear com cartão */
  const linkBtn = document.getElementById('giftOptLink');
  if (!CARD_ENABLED) {
    linkBtn.style.display = '';
    linkBtn.removeAttribute('href');
    linkBtn.classList.add('is-locked');
    document.getElementById('giftOptLinkLabel').textContent = '🔒 Presentear com cartão';
    document.getElementById('giftOptLinkHint').textContent  = 'Indisponível no momento';
  } else {
    linkBtn.classList.remove('is-locked');
    const paymentUrl = resolveCardPaymentUrl(paymentBaseUrl);
    if (paymentUrl !== '#') {
      linkBtn.style.display = '';
      linkBtn.href = paymentUrl;
      document.getElementById('giftOptLinkLabel').textContent = 'Presentear com cartão';
      document.getElementById('giftOptLinkHint').textContent  = `Valor sugerido: ${item.price || formatBRL(item.amount)}`;
    } else {
      linkBtn.style.display = 'none';
    }
  }

  /* Fecha Pix inline se estava aberto */
  document.getElementById('giftPixInline').classList.remove('is-open');
  document.getElementById('giftOptPix').querySelector('.gift-payment-opt-arrow').textContent = '→';

  document.getElementById('giftModalBackdrop').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('giftModalBackdrop').classList.remove('is-open');
  document.body.style.overflow = '';
}

/* Toggle Pix inline */
document.getElementById('giftOptPix').addEventListener('click', () => {
  const pix = document.getElementById('giftPixInline');
  const arrow = document.getElementById('giftOptPix').querySelector('.gift-payment-opt-arrow');
  const isOpen = pix.classList.toggle('is-open');
  arrow.textContent = isOpen ? '↓' : '→';
});

/* Copiar Pix no modal */
document.getElementById('giftModalPixCopy').addEventListener('click', () => {
  navigator.clipboard?.writeText(_pixKey)
    .then(() => showToast('Chave Pix copiada ✓'))
    .catch(() => showToast('Chave Pix copiada ✓'));
});

/* Fechar modal */
document.getElementById('giftModalClose').addEventListener('click', closeModal);
document.getElementById('giftModalBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('giftModalBackdrop')) closeModal();
});

/* ── Tabs ────────────────────────────────────────────────────────────── */
document.querySelectorAll('.gift-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.gift-tab').forEach(t => t.classList.remove('is-active'));
    document.querySelectorAll('.gift-tab-panel').forEach(p => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    document.getElementById('panel-' + tab.dataset.panel)?.classList.add('is-active');
  });
});

/* ── Toast ───────────────────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('giftToast');
  t.textContent = msg;
  t.classList.add('is-visible');
  setTimeout(() => t.classList.remove('is-visible'), 2600);
}

function normalizeUrl(url) {
  if (!url) return '#';
  try {
    return new URL(url.startsWith('http') ? url : 'https://' + url).toString();
  } catch { return '#'; }
}

function hasValidHttpUrl(url) {
  if (!url) return false;
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeHttpUrl(url) {
  if (!url) return '';
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function resolveGiftCardBodyText(text, hasActiveCardLink) {
  const defaultDisabledCardBody = 'Em breve, esta opção estará disponível.';
  const defaultEnabledCardBody = 'Se preferir, você pode nos presentear através do Cartão de crédito (possibilidade de parcelamento).';
  const configuredText = String(text || '').trim();

  if (configuredText && configuredText !== defaultDisabledCardBody) {
    return configuredText;
  }

  if (hasActiveCardLink) {
    return defaultEnabledCardBody;
  }

  return configuredText || defaultDisabledCardBody;
}

function revealGiftPageContent() {
  document.querySelectorAll('.reveal').forEach((element) => {
    element.classList.add('visible');
  });
}

/* ── Integração com app:ready do script.js ──────────────────────────── */
window.addEventListener('app:ready', ({ detail: { config } }) => {
  revealGiftPageContent();

  const pixKey = config?.gift?.pixKey || '';
  const qrSrc  = config?.gift?.pixQrImage || 'assets/images/icons/pix-placeholder.svg';
  const cardLink = String(config?.gift?.cardPaymentLink || '').trim();
  const normalizedCardLink = normalizeHttpUrl(cardLink);
  const cardEnabled = config?.gift?.cardPaymentEnabled === true;
  const hasValidCardLink = Boolean(normalizedCardLink);
  const shouldShowCard = cardEnabled && hasValidCardLink;
  CARD_ENABLED = shouldShowCard;
  const { catalog: activeCatalog, catalogKey } = resolveActiveCatalog(config?.gift || {});
  const categoryFallback = DEFAULT_CATALOGS[catalogKey]?.items?.[0]?.category || 'Presente';
  const normalizedCatalog = sanitizeCatalogItems(activeCatalog?.items, categoryFallback);

  ACTIVE_CATALOG_TITLE = activeCatalog?.title || DEFAULT_CATALOGS[catalogKey]?.title || DEFAULT_CATALOGS.honeymoon.title;
  ACTIVE_CATALOG_SUBTITLE = activeCatalog?.subtitle || DEFAULT_CATALOGS[catalogKey]?.subtitle || '';

  if (normalizedCatalog.length) {
    GIFT_ITEMS = normalizedCatalog;
  } else {
    GIFT_ITEMS = DEFAULT_CATALOGS[catalogKey]?.items || DEFAULT_HONEYMOON_ITEMS;
  }

  /* Preenche textos */
  const setText = (id, val) => { if (val && document.getElementById(id)) document.getElementById(id).textContent = val; };
  const setSrc  = (id, val) => { if (val && document.getElementById(id)) document.getElementById(id).src = val; };

  setText('giftOverlayTitle',   config?.texts?.giftTitle);
  setText('giftIntroText',      config?.texts?.giftIntro);
  setText('giftPixTitle',       config?.texts?.giftPixTitle);
  setText('giftPixDescription', config?.texts?.giftPixDescription);
  setText('giftPixCopyLabel',   config?.texts?.giftPixCopyLabel);
  setText('giftCardTitle',      config?.texts?.giftCardTitle);
  setText('giftCardBody',       resolveGiftCardBodyText(config?.texts?.giftCardBody, shouldShowCard));
  setText('giftCardPlaceholder', config?.texts?.giftCardPlaceholder);
  setText('mainFooterNames',    config?.couple?.names);
  setText('mainFooterNote',     config?.texts?.footerNote);
  setText('pixCode',            pixKey);

  const listSubtitleEl = document.getElementById('giftListSubtitle');
  if (listSubtitleEl && ACTIVE_CATALOG_SUBTITLE) {
    listSubtitleEl.textContent = ACTIVE_CATALOG_SUBTITLE;
  }

  setSrc('giftPixQr',  qrSrc);

  /* Atualiza data-copy-value com chave real */
  const copyBtn = document.getElementById('giftPixCopyButton');
  if (copyBtn && pixKey) copyBtn.dataset.copyValue = pixKey;

  /* Cartão */
  const cardLinkEl = document.getElementById('giftCardLink');
  if (cardLinkEl && shouldShowCard) cardLinkEl.href = normalizedCardLink;
  if (!shouldShowCard) {
    const cardTab = document.querySelector('[data-panel="cartao"]');
    if (cardTab) cardTab.hidden = true;
    const cardPanel = document.getElementById('panel-cartao');
    if (cardPanel) cardPanel.hidden = true;
  }

  /* Pix — respeita gift.pixEnabled do dashboard */
  const pixEnabled = config?.gift?.pixEnabled !== false && !!pixKey;
  if (!pixEnabled) {
    const pixTab = document.querySelector('[data-panel="pix"]');
    if (pixTab) pixTab.hidden = true;
    const pixPanel = document.getElementById('panel-pix');
    if (pixPanel) pixPanel.hidden = true;
  }

  /* Catálogo — respeita gift.catalogEnabled do dashboard */
  const catalogEnabled = config?.gift?.catalogEnabled !== false;
  if (!catalogEnabled) {
    const listaTab = document.querySelector('[data-panel="lista"]');
    if (listaTab) listaTab.hidden = true;
    const listaPanel = document.getElementById('panel-lista');
    if (listaPanel) listaPanel.hidden = true;
  }

  /* Lista externa — exibe aba e preenche dados quando habilitada */
  const extGift = config?.gift?.external || {};
  const extEnabled = extGift.enabled && extGift.url;

  if (extEnabled) {
    const tabExternal = document.getElementById('tabExternal');
    if (tabExternal) tabExternal.hidden = false;

    // CRÍTICO: remover hidden do panel também — o atributo hidden
    // aplica display:none !important que bloqueia a classe is-active
    const panelExterno = document.getElementById('panel-externo');
    if (panelExterno) panelExterno.hidden = false;

    const normalizedExtUrl = normalizeUrl(extGift.url);
    const extLabel = extGift.label || 'Ver lista completa';
    const extStore = extGift.store || 'Lista externa';

    const btnEl = document.getElementById('btnExternalList');
    if (btnEl) btnEl.href = normalizedExtUrl;

    const labelEl = document.getElementById('giftExternalLabel');
    if (labelEl) labelEl.textContent = extLabel + ' →';

    const titleEl = document.getElementById('giftExternalTitle');
    if (titleEl) titleEl.textContent = extStore;

    const tagEl = document.getElementById('giftExternalTag');
    if (tagEl) tagEl.textContent = extStore;
  }

  /* Ativa o primeiro tab visível caso o padrão tenha sido ocultado */
  const allTabs   = Array.from(document.querySelectorAll('.gift-tab:not([hidden])'));
  const allPanels = Array.from(document.querySelectorAll('.gift-tab-panel:not([hidden])'));
  document.querySelectorAll('.gift-tab').forEach(t => t.classList.remove('is-active'));
  document.querySelectorAll('.gift-tab-panel').forEach(p => p.classList.remove('is-active'));
  if (allTabs.length)   allTabs[0].classList.add('is-active');
  if (allPanels.length) allPanels[0].classList.add('is-active');

  /* Renderiza lista com chave Pix carregada */
  if (catalogEnabled) renderGiftList(pixKey, qrSrc, normalizedCardLink);
});

/* Fallback — renderiza lista mesmo sem app:ready */
setTimeout(() => {
  const grid = document.getElementById('giftGridList');
  revealGiftPageContent();
  if (grid && !grid.children.length) renderGiftList('', '', '');
}, 3000);

window.addEventListener('app:ready', () => markContentReady());
