import { initExtraPage } from './extra-page.js';
import { setText } from './utils.js';

function escapeAttr(value) {
    return String(value || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showSection(id) {
    const el = document.getElementById(id);
    if (el) el.removeAttribute('hidden');
}

function renderPaletteInto(containerId, colors) {
    const container = document.getElementById(containerId);
    if (!container || !Array.isArray(colors) || colors.length === 0) return;

    container.innerHTML = colors.map((color) => {
        const hex = String(color?.hex || '').trim();
        const name = String(color?.name || '').trim();
        const label = name || hex || '';
        return `<div class="traje-swatch-item">
            <span class="traje-swatch" style="background-color:${escapeAttr(hex || '#cccccc')}" role="img" aria-label="${escapeAttr(label)}"></span>
            ${label ? `<span class="traje-swatch-label">${escapeAttr(label)}</span>` : ''}
        </div>`;
    }).join('');
}

function renderSoloColor(swatchId, nameId, color) {
    const hex = String(color?.hex || '').trim();
    const name = String(color?.name || '').trim();
    if (!hex) return;

    const swatch = document.getElementById(swatchId);
    if (swatch) swatch.style.backgroundColor = hex;

    const nameEl = document.getElementById(nameId);
    if (nameEl) nameEl.textContent = name || hex;
}

initExtraPage({
    pageKey: 'traje',
    idPrefix: 'traje',
    onReady: (content) => {
        setText('trajeDresscode', content.dresscode);

        const hasBrideColor = String(content.brideColor?.hex || '').trim();
        if (hasBrideColor) {
            showSection('trajeBrideColorCard');
            renderSoloColor('trajeBrideSwatch', 'trajeBrideColorName', content.brideColor);
        }

        const hasGroomColor = String(content.groomColor?.hex || '').trim();
        if (hasGroomColor) {
            showSection('trajeGroomColorCard');
            renderSoloColor('trajeGroomSwatch', 'trajeGroomColorName', content.groomColor);
        }

        const hasBridesmaids = Array.isArray(content.bridesmaidsPalette) && content.bridesmaidsPalette.length > 0;
        if (hasBridesmaids) {
            showSection('trajeBridesmaidsCard');
            renderPaletteInto('trajeBridesmaidsPalette', content.bridesmaidsPalette);
        }

        const hasGroomsMen = Array.isArray(content.groomsMenPalette) && content.groomsMenPalette.length > 0;
        if (hasGroomsMen) {
            showSection('trajeGroomsMenCard');
            renderPaletteInto('trajeGroomsMenPalette', content.groomsMenPalette);
        }

        const hasNote = String(content.note || '').trim();
        if (hasNote) {
            showSection('trajeNoteCard');
            setText('trajeNote', content.note);
        }
    },
});
