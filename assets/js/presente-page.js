import { markContentReady } from './loading-screen.js';

const DEFAULT_HONEYMOON_ITEMS = [
    { id: 'taxas-embarque', name: 'Taxas de Embarque', desc: 'Ajuda com taxas e bagagens da viagem.', amount: 140.00, category: 'Lua de Mel', icon: '🏷️' },
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
};

let giftItems = DEFAULT_HONEYMOON_ITEMS;
let cardEnabled = true;
let pixKeyState = '';

function setText(id, value) {
    if (!value) return;
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function setSource(id, value) {
    if (!value) return;
    const element = document.getElementById(id);
    if (element) {
        element.setAttribute('src', value);
    }
}

function formatBRL(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) {
        return 'R$ 0,00';
    }

    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatAmountForMercadoPagoParam(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) {
        return '0,00';
    }

    return value.toFixed(2).replace('.', ',');
}

function sanitizeCatalogItems(items = [], fallbackCategory = 'Presente') {
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
                icon: String(item.icon ?? '💛'),
            };
        });
}

function resolveActiveCatalog(giftConfig = {}) {
    const catalogsRoot = giftConfig?.catalogs;
    const lists = catalogsRoot?.lists;
    const configuredActiveKey = giftConfig?.activeCatalogKey || catalogsRoot?.activeKey || giftConfig?.catalog?.key;

    if (giftConfig?.catalog && typeof giftConfig.catalog === 'object') {
        const catalog = giftConfig.catalog;
        if (Array.isArray(catalog.items) && catalog.items.length > 0) {
            return { catalog, catalogKey: configuredActiveKey || catalog.key || 'honeymoon' };
        }
    }

    if (lists && typeof lists === 'object' && !Array.isArray(lists)) {
        const entries = Object.entries(lists).filter(([, value]) => value && typeof value === 'object');
        if (entries.length > 0) {
            const byKey = configuredActiveKey && lists[configuredActiveKey]
                ? [configuredActiveKey, lists[configuredActiveKey]]
                : null;
            const enabledEntry = entries.find(([, value]) => value.enabled !== false);
            const selectedEntry = byKey || enabledEntry || entries[0];
            const [catalogKey, catalog] = selectedEntry;
            return { catalog, catalogKey };
        }
    }

    return { catalog: DEFAULT_CATALOGS.honeymoon, catalogKey: 'honeymoon' };
}

function buildMercadoPagoUrl(baseUrl, amount) {
    if (!baseUrl) {
        return '#';
    }

    try {
        const normalizedBaseUrl = baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
            ? baseUrl
            : `https://${baseUrl}`;
        const url = new URL(normalizedBaseUrl);
        url.searchParams.set('amount', formatAmountForMercadoPagoParam(amount));
        return url.toString();
    } catch {
        return '#';
    }
}

function normalizeUrl(url) {
    if (!url) {
        return '#';
    }

    try {
        return new URL(url.startsWith('http') ? url : `https://${url}`).toString();
    } catch {
        return '#';
    }
}

function showToast(message) {
    const toast = document.getElementById('giftToast');
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function copyText(value) {
    if (!value) {
        return Promise.reject(new Error('empty'));
    }

    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(value);
    }

    const temporaryField = document.createElement('textarea');
    temporaryField.value = value;
    temporaryField.setAttribute('readonly', '');
    temporaryField.style.position = 'absolute';
    temporaryField.style.left = '-9999px';
    document.body.appendChild(temporaryField);
    temporaryField.select();
    document.execCommand('copy');
    document.body.removeChild(temporaryField);
    return Promise.resolve();
}

function openModal(itemId, pixKey, qrSrc, paymentBaseUrl) {
    const item = giftItems.find((entry) => entry.id === itemId);
    if (!item) {
        return;
    }

    pixKeyState = pixKey;

    setText('giftModalItemName', item.name);
    setText('giftModalItemPrice', `${item.price || formatBRL(item.amount)} (sugerido)`);
    setText('giftModalPixKey', pixKey || 'Chave Pix não configurada');
    setSource('giftModalQrImg', qrSrc || 'assets/images/icons/pix-placeholder.svg');

    const linkButton = document.getElementById('giftOptLink');
    const linkLabel = document.getElementById('giftOptLinkLabel');
    const linkHint = document.getElementById('giftOptLinkHint');

    if (!linkButton || !linkLabel || !linkHint) {
        return;
    }

    if (!cardEnabled) {
        linkButton.style.display = '';
        linkButton.removeAttribute('href');
        linkButton.classList.add('is-locked');
        linkLabel.textContent = 'Link de pagamento';
        linkHint.textContent = 'Indisponível';
    } else {
        const paymentUrl = buildMercadoPagoUrl(paymentBaseUrl, item.amount);
        linkButton.classList.remove('is-locked');

        if (paymentUrl !== '#') {
            linkButton.style.display = '';
            linkButton.setAttribute('href', paymentUrl);
            linkLabel.textContent = 'Pagar com link de pagamento';
            linkHint.textContent = `Valor sugerido: ${item.price || formatBRL(item.amount)}`;
        } else {
            linkButton.style.display = 'none';
        }
    }

    const pixInline = document.getElementById('giftPixInline');
    const pixArrow = document.querySelector('#giftOptPix .gift-payment-opt-arrow');
    pixInline?.classList.remove('is-open');
    if (pixArrow) {
        pixArrow.textContent = '→';
    }

    document.getElementById('giftModalBackdrop')?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('giftModalBackdrop')?.classList.remove('is-open');
    document.body.style.overflow = '';
}

function renderGiftList(pixKey, qrSrc, paymentBaseUrl) {
    const grid = document.getElementById('giftGridList');
    if (!grid) {
        return;
    }

    const sortedItems = [...giftItems].sort((a, b) => (a.amount || 0) - (b.amount || 0));
    grid.innerHTML = sortedItems.map((item) => `
        <article
            class="gift-item"
            role="button"
            tabindex="0"
            aria-label="Presentear com ${item.name} - ${item.price || formatBRL(item.amount)}"
            data-id="${item.id}"
        >
            <div class="gift-item-img-wrap">
                <div class="gift-item-icon">${item.icon}</div>
                <span class="gift-item-badge">${item.category}</span>
            </div>
            <div class="gift-item-body">
                <div class="gift-item-name">${item.name}</div>
                <div class="gift-item-desc">${item.desc}</div>
                <div class="gift-item-price">${item.price || formatBRL(item.amount)}</div>
                <div class="gift-item-price-hint">Valor sugerido</div>
                <div class="gift-item-btn">
                    <span class="gift-item-btn-label">Presentear</span>
                    <span class="gift-item-btn-arrow">→</span>
                </div>
            </div>
        </article>
    `).join('');

    grid.querySelectorAll('.gift-item').forEach((card) => {
        const open = () => openModal(card.dataset.id, pixKey, qrSrc, paymentBaseUrl);
        card.addEventListener('click', open);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
            }
        });
    });
}

function activateVisibleTab() {
    const tabs = Array.from(document.querySelectorAll('.gift-tab:not([hidden])'));
    const panels = Array.from(document.querySelectorAll('.gift-tab-panel:not([hidden])'));

    document.querySelectorAll('.gift-tab').forEach((tab) => tab.classList.remove('is-active'));
    document.querySelectorAll('.gift-tab-panel').forEach((panel) => panel.classList.remove('is-active'));

    if (tabs[0]) {
        tabs[0].classList.add('is-active');
    }
    if (panels[0]) {
        panels[0].classList.add('is-active');
    }
}

function bindStaticInteractions() {
    document.querySelectorAll('.gift-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.gift-tab').forEach((item) => item.classList.remove('is-active'));
            document.querySelectorAll('.gift-tab-panel').forEach((panel) => panel.classList.remove('is-active'));
            tab.classList.add('is-active');
            document.getElementById(`panel-${tab.dataset.panel}`)?.classList.add('is-active');
        });
    });

    document.getElementById('giftOptPix')?.addEventListener('click', () => {
        const pixPanel = document.getElementById('giftPixInline');
        const arrow = document.querySelector('#giftOptPix .gift-payment-opt-arrow');
        const isOpen = pixPanel?.classList.toggle('is-open');
        if (arrow) {
            arrow.textContent = isOpen ? '↓' : '→';
        }
    });

    document.getElementById('giftModalPixCopy')?.addEventListener('click', async () => {
        try {
            await copyText(pixKeyState);
            showToast('Chave Pix copiada');
        } catch {
            showToast('Não foi possível copiar agora');
        }
    });

    document.getElementById('giftModalClose')?.addEventListener('click', closeModal);
    document.getElementById('giftModalBackdrop')?.addEventListener('click', (event) => {
        if (event.target?.id === 'giftModalBackdrop') {
            closeModal();
        }
    });
}

function applyGiftConfig(config) {
    const pixKey = config?.gift?.pixKey || '';
    const qrSrc = config?.gift?.pixQrImage || 'assets/images/icons/pix-placeholder.svg';
    const cardLink = config?.gift?.cardPaymentLink || '';
    cardEnabled = config?.gift?.cardPaymentEnabled !== false;

    const { catalog: activeCatalog, catalogKey } = resolveActiveCatalog(config?.gift || {});
    const categoryFallback = DEFAULT_CATALOGS[catalogKey]?.items?.[0]?.category || 'Presente';
    const normalizedCatalog = sanitizeCatalogItems(activeCatalog?.items, categoryFallback);
    giftItems = normalizedCatalog.length
        ? normalizedCatalog
        : (DEFAULT_CATALOGS[catalogKey]?.items || DEFAULT_HONEYMOON_ITEMS);

    setText('giftTag', config?.texts?.giftTag);
    setText('giftOverlayTitle', config?.texts?.giftTitle);
    setText('giftIntroText', config?.texts?.giftIntro);
    setText('giftPixTag', config?.texts?.giftPixTag);
    setText('giftPixTitle', config?.texts?.giftPixTitle);
    setText('giftPixDescription', config?.texts?.giftPixDescription);
    setText('giftPixCopyLabel', config?.texts?.giftPixCopyLabel);
    setText('giftCardTag', config?.texts?.giftCardTag);
    setText('giftCardTitle', config?.texts?.giftCardTitle);
    setText('giftCardBody', config?.texts?.giftCardBody);
    setText('giftCardPlaceholder', config?.texts?.giftCardPlaceholder);
    setText('mainFooterNames', config?.couple?.names);
    setText('mainFooterNote', config?.texts?.footerNote);
    setText('backToExtrasButton', config?.texts?.backToExtrasButton);
    setText('pixCode', pixKey);
    setSource('giftPixQr', qrSrc);

    const activeCatalogTitle = activeCatalog?.title || DEFAULT_CATALOGS[catalogKey]?.title || DEFAULT_CATALOGS.honeymoon.title;
    const activeCatalogSubtitle = activeCatalog?.subtitle || DEFAULT_CATALOGS[catalogKey]?.subtitle || '';
    setText('giftListTag', activeCatalogTitle);
    if (activeCatalogSubtitle) {
        setText('giftListSubtitle', activeCatalogSubtitle);
    }

    const cardLinkElement = document.getElementById('giftCardLink');
    if (cardLinkElement && cardLink) {
        cardLinkElement.setAttribute('href', cardLink);
    }

    const copyButton = document.getElementById('giftPixCopyButton');
    if (copyButton && pixKey) {
        copyButton.dataset.copyValue = pixKey;
    }

    const pixEnabled = config?.gift?.pixEnabled !== false && Boolean(pixKey);
    if (!pixEnabled) {
        document.querySelector('[data-panel="pix"]')?.setAttribute('hidden', '');
        document.getElementById('panel-pix')?.setAttribute('hidden', '');
    }

    const catalogEnabled = config?.gift?.catalogEnabled !== false;
    if (!catalogEnabled) {
        document.querySelector('[data-panel="lista"]')?.setAttribute('hidden', '');
        document.getElementById('panel-lista')?.setAttribute('hidden', '');
    }

    if (!cardEnabled) {
        document.querySelector('[data-panel="cartao"]')?.setAttribute('hidden', '');
        document.getElementById('panel-cartao')?.setAttribute('hidden', '');
    }

    const externalGift = config?.gift?.external || {};
    const externalEnabled = externalGift.enabled && externalGift.url;
    if (externalEnabled) {
        document.getElementById('tabExternal')?.removeAttribute('hidden');
        document.getElementById('panel-externo')?.removeAttribute('hidden');
        document.getElementById('btnExternalList')?.setAttribute('href', normalizeUrl(externalGift.url));
        setText('giftExternalLabel', `${externalGift.label || 'Ver lista completa'} →`);
        setText('giftExternalTitle', externalGift.store || 'Lista externa');
        setText('giftExternalTag', externalGift.store || 'Lista externa');
    }

    activateVisibleTab();
    if (catalogEnabled) {
        renderGiftList(pixKey, qrSrc, cardLink);
    }

    markContentReady();
}

function initPresentPage() {
    bindStaticInteractions();

    window.addEventListener('app:ready', ({ detail }) => {
        applyGiftConfig(detail?.config || {});
    });

    if (window.CONFIG) {
        applyGiftConfig(window.CONFIG);
        return;
    }

    window.setTimeout(() => {
        const grid = document.getElementById('giftGridList');
        if (grid && !grid.children.length) {
            renderGiftList('', '', '');
            markContentReady();
        }
    }, 3000);
}

initPresentPage();
