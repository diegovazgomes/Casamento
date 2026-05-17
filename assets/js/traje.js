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

function toggleSection(id, show) {
    const el = document.getElementById(id);
    if (el && show) el.removeAttribute('hidden');
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
    },
});
