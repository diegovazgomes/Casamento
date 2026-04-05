# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static wedding invitation website for Siannah & Diego (06/09/2026). No build step, no package manager, no framework — pure HTML, CSS, and vanilla ES modules served directly from the file system or any static host.

To preview the site, open `index.html` in a browser or use any local static server, e.g.:

```bash
npx serve .
# or
python -m http.server 8080
```

The gift page is at `presente.html`.

## Architecture

### Content configuration

All user-facing text, event data, WhatsApp details, and media paths live in [assets/config/site.json](assets/config/site.json). This is the single source of truth for content. The JS reads it at runtime and populates the DOM — the HTML has only element IDs, no hardcoded text.

Key fields in `site.json`:
- `couple`, `event`, `texts` — display content
- `whatsapp` — destination phone, message templates with `{name}`, `{phone}`, `{recipientName}`, `{firstName}`, `{delaySeconds}` placeholders, and redirect feedback strings
- `gift.pixKey` — Pix key (currently a placeholder)
- `media.tracks` — audio sources, volume, and start offsets

### Theme system

Each theme is a self-contained JSON file in [assets/config/themes/](assets/config/themes/). The active theme is set via `ACTIVE_THEME_PATH` at the top of [assets/js/script.js](assets/js/script.js).

Available themes: `classic-gold.json`, `classic-silver.json`.

**To switch themes**, change only this line in `script.js`:
```js
const ACTIVE_THEME_PATH = 'assets/config/themes/classic-gold.json';
```

**Theme JSON structure** — each file is fully self-contained with these sections:

| Seção | O que controla |
|---|---|
| `colors` | Todas as cores: fundo, texto, borda, primária, gradientes de áudio, etc. |
| `typography.fonts` | Famílias tipográficas: `primary`, `serif`, `accent` |
| `typography.sizes` | Tamanhos de fonte de todos os elementos (hero, countdown, RSVP, footer, etc.) |
| `spacing` | Todos os espaçamentos: padding de seção, gaps, margens internas de componentes |
| `layout` | Dimensões do hero, largura máxima do conteúdo |
| `components` | Tamanhos de componentes específicos: seta de scroll, cards do countdown, inputs do RSVP |
| `radius` | Arredondamento de cards e botões |
| `effects` | Sombras, gradientes de fundo/overlay/botão, transições |
| `animation` | `fadeDuration`, `staggerDelay` (CSS), `heroFadeDuration` (CSS), `heroRevealDelayMs` (JS) |
| `countdown` | `format` e `updateInterval` do contador regressivo |
| `responsive.mobile` | Overrides aplicados em viewports ≤ 767px (sobrepõe qualquer seção acima) |

O fluxo em runtime:
1. `loadTheme()` carrega o JSON e faz merge com `DEFAULT_THEME` (fallback embutido no `script.js`)
2. `resolveTheme()` aplica o bloco `responsive.mobile` se o viewport for mobile
3. `applyTheme()` escreve todas as propriedades como CSS custom properties no `:root`
4. O CSS usa apenas `var(--...)` — sem valores hardcoded

**Para criar um novo tema**: duplique `classic-gold.json`, altere os valores e aponte `ACTIVE_THEME_PATH` para o novo arquivo. O bloco `responsive.mobile` só precisa conter as propriedades que diferem do desktop.

Documentação detalhada de cada propriedade: [docs/theme-guide.md](docs/theme-guide.md).

### JS module structure

Entry point: [assets/js/script.js](assets/js/script.js) — carrega config + tema, aplica CSS vars, instancia os módulos.

| Módulo | Classe | Responsabilidade |
|---|---|---|
| [main.js](assets/js/main.js) | `WeddingApp` | Reveal do hero, scroll hint, IntersectionObserver de seções |
| [countdown.js](assets/js/countdown.js) | `Countdown` | Contador regressivo ao vivo |
| [rsvp.js](assets/js/rsvp.js) | `RSVP` | Formulário de confirmação + redirect WhatsApp |
| [audio.js](assets/js/audio.js) | `AudioController` | Botão flutuante de áudio, troca de faixas entre páginas |
| [gallery.js](assets/js/gallery.js) | — | Galeria de fotos |
| [map.js](assets/js/map.js) | — | Link do mapa |
| [presente.js](assets/js/presente.js) | `PresentPage` | Pix copy-to-clipboard, overlay de presente |

### Pages

- `index.html` — convite completo: intro screen, hero, countdown, detalhes, RSVP, footer
- `presente.html` — página de presente: QR Pix, botão de cópia, placeholder de cartão
