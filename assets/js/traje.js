import { initExtraPage } from './extra-page.js';
import { setText, escapeHtml } from './utils.js';

function renderPalette(containerId, colors) {
    const el = document.getElementById(containerId);
    if (!el || !Array.isArray(colors) || colors.length === 0) return;
    el.innerHTML = colors.map(c => `
        <div class="traje-swatch">
            <div class="traje-swatch-circle"
                 style="background-color:${escapeHtml(c.hex || '#ccc')}"
                 role="img"
                 aria-label="${escapeHtml(c.name || c.hex || 'Cor')}"></div>
            <span class="traje-swatch-label">${escapeHtml(c.name || '')}${c.name && c.hex ? '<br>' : ''}${escapeHtml(c.hex || '')}</span>
        </div>
    `).join('');
}

function renderSoloColor(containerId, color) {
    const el = document.getElementById(containerId);
    if (!el || !color?.hex?.trim()) return;
    el.innerHTML = `
        <div class="traje-solo-circle"
             style="background-color:${escapeHtml(color.hex)}"
             role="img"
             aria-label="${escapeHtml(color.name || color.hex)}"></div>
        <span class="traje-solo-label">${color.name ? escapeHtml(color.name) + '<br>' : ''}${escapeHtml(color.hex)}</span>
    `;
}

const OPTIONAL_SECTION_IDS = [
    'trajeBridesmaidsPaletteSection',
    'trajeGroomsmenPaletteSection',
    'trajeBrideColorSection',
    'trajeGroomColorSection',
    'trajeNoteSection',
];

function toggleSection(id, show) {
    const el = document.getElementById(id);
    if (el && show) el.removeAttribute('hidden');
}

function makeDivider() {
    const el = document.createElement('div');
    el.className = 'divider reveal';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="divider-line"></div><div class="divider-diamond"></div><div class="divider-line"></div>';
    return el;
}

function insertDividersBetweenSections() {
    const parent = document.querySelector('.extra-main');
    if (!parent) return;

    const visible = OPTIONAL_SECTION_IDS
        .map(id => document.getElementById(id))
        .filter(el => el && !el.hasAttribute('hidden'));

    // Primeiro visível: o divider estático após dresscode já o separa.
    // A partir do segundo: inserir um divider antes de cada um.
    visible.forEach((section, i) => {
        if (i === 0) return;
        parent.insertBefore(makeDivider(), section);
    });
}

initExtraPage({
    pageKey: 'traje',
    idPrefix: 'traje',
    onReady: (content) => {
        setText('trajeDresscodeValue', content.dresscode);

        const hasBridesmaids = Array.isArray(content.bridesmaidsPalette) && content.bridesmaidsPalette.length > 0;
        toggleSection('trajeBridesmaidsPaletteSection', hasBridesmaids);
        if (hasBridesmaids) renderPalette('trajeBridesmaidsPalette', content.bridesmaidsPalette);

        const hasGroomsmen = Array.isArray(content.groomsMenPalette) && content.groomsMenPalette.length > 0;
        toggleSection('trajeGroomsmenPaletteSection', hasGroomsmen);
        if (hasGroomsmen) renderPalette('trajeGroomsmenPalette', content.groomsMenPalette);

        const hasBrideColor = content.brideColor?.hex?.trim();
        toggleSection('trajeBrideColorSection', hasBrideColor);
        if (hasBrideColor) renderSoloColor('trajeBrideColor', content.brideColor);

        const hasGroomColor = content.groomColor?.hex?.trim();
        toggleSection('trajeGroomColorSection', hasGroomColor);
        if (hasGroomColor) renderSoloColor('trajeGroomColor', content.groomColor);

        const hasNote = content.note?.trim();
        toggleSection('trajeNoteSection', hasNote);
        if (hasNote) setText('trajeNote', content.note);

        insertDividersBetweenSections();
    },
});
