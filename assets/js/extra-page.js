import { setText, revealElements } from './utils.js';
import { markContentReady } from './loading-screen.js';

function renderExtraPage({ pageKey, idPrefix, onReady, onReveal }, config) {
    const content = config?.pages?.[pageKey]?.content;
    if (!content) return;

    if (content.title) {
        document.title = content.title;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && content.intro) {
        metaDesc.setAttribute('content', content.intro);
    }

    setText(`${idPrefix}Tag`, content.tag);
    setText(`${idPrefix}Title`, content.title);
    setText(`${idPrefix}Intro`, content.intro);

    if (typeof onReady === 'function') {
        onReady(content, config);
    }

    revealElements('.reveal');

    if (typeof onReveal === 'function') {
        onReveal(content, config);
    }

    markContentReady();
}

/**
 * Initializes an extra page by listening for the app:ready event,
 * populating shared intro fields (tag, title, intro), updating
 * document.title and meta description dynamically, calling the
 * page-specific onReady callback, triggering reveal, and optionally
 * calling an onReveal callback for post-reveal work (e.g. gallery).
 *
 * @param {object}   options
 * @param {string}   options.pageKey   - Key in config.pages (e.g. 'historia')
 * @param {string}   options.idPrefix  - DOM ID prefix (e.g. 'historia' → historiaTag / historiaTitle / historiaIntro)
 * @param {function} options.onReady   - Called with (content, config) after shared fields are set
 * @param {function} [options.onReveal]- Called with (content, config) after revealElements('.reveal')
 */
export function initExtraPage({ pageKey, idPrefix, onReady, onReveal }) {
    const options = { pageKey, idPrefix, onReady, onReveal };
    let initialized = false;

    const initialize = (config) => {
        if (initialized || !config) {
            return;
        }

        initialized = true;
        renderExtraPage(options, config);
    };

    window.addEventListener('app:ready', ({ detail }) => {
        initialize(detail?.config);
    });

    if (window.CONFIG) {
        initialize(window.CONFIG);
    }
}
