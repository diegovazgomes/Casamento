/**
 * font-preview.js
 * Loads typography.families from assets/config/typography.json and renders
 * a comparison card for each unique font family.
 */

const TYPOGRAPHY_PATH = 'assets/config/typography.json';

// Keys with duplicate CSS values (semantic aliases — display, body, serif, accent)
// are filtered out by deduplicating on CSS value, keeping the first occurrence.

async function loadFamilies() {
  const res = await fetch(TYPOGRAPHY_PATH);
  if (!res.ok) throw new Error(`Failed to load ${TYPOGRAPHY_PATH}: ${res.status}`);
  const data = await res.json();
  return data?.typography?.families ?? {};
}

/**
 * Returns [{key, cssValue}, ...] with one entry per unique CSS font-family value.
 * Alias keys (display, body, serif, accent) share values with earlier keys and are dropped.
 */
function deduplicate(families) {
  const seen = new Set();
  return Object.entries(families).reduce((acc, [key, cssValue]) => {
    if (!seen.has(cssValue)) {
      seen.add(cssValue);
      acc.push({ key, cssValue });
    }
    return acc;
  }, []);
}

function createCard({ key, cssValue }) {
  const card = document.createElement('div');
  card.className = 'fp-card';

  const name = document.createElement('div');
  name.className = 'fp-name';
  name.textContent = key.replace(/_/g, ' ');

  const meta = document.createElement('div');
  meta.className = 'fp-meta';
  meta.textContent = cssValue;

  const sampleMain = document.createElement('div');
  sampleMain.className = 'fp-sample fp-sample--main';
  sampleMain.style.fontFamily = cssValue;
  sampleMain.textContent = 'Diego & Siannah';

  const sampleUpper = document.createElement('div');
  sampleUpper.className = 'fp-sample fp-sample--upper';
  sampleUpper.style.fontFamily = cssValue;
  sampleUpper.textContent = 'CASAMENTO';

  const sampleLower = document.createElement('div');
  sampleLower.className = 'fp-sample fp-sample--lower';
  sampleLower.style.fontFamily = cssValue;
  sampleLower.textContent = 'casamento';

  card.append(name, meta, sampleMain, sampleUpper, sampleLower);
  return card;
}

function renderGrid(container, items) {
  container.innerHTML = '';

  if (items.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'fp-fallback';
    msg.textContent = 'Nenhuma família tipográfica encontrada em typography.json.';
    container.appendChild(msg);
    return;
  }

  items.forEach(item => container.appendChild(createCard(item)));
}

async function init() {
  const container = document.getElementById('font-grid');
  if (!container) return;

  try {
    const families = await loadFamilies();
    const items = deduplicate(families);
    renderGrid(container, items);
  } catch (err) {
    console.error('[font-preview]', err);
    container.innerHTML = `<p class="fp-fallback">Erro ao carregar tipografia: ${err.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
