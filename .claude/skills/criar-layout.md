# Skill: Criar Novo Layout

Cria um novo layout visual completo para o projeto de convite de casamento — `layout.css` + `defaults.json` — e o registra automaticamente no dashboard, editor e seletores de layout.

---

## Fluxo obrigatório (siga esta ordem)

### Passo 1 — Solicitar inspiração

Peça ao usuário que cole uma imagem, PDF ou prints de referência visual diretamente no chat.
Aceite também descrições em texto como alternativa ("minimalista, tipografia bold, fundo branco").

Diga ao usuário:
> "Cole a imagem ou PDF de inspiração aqui no chat (Canva, Pinterest, print de site). Se preferir, descreva o estilo em palavras."

### Passo 2 — Analisar a inspiração e extrair tokens

Analise visualmente a inspiração e extraia os seguintes tokens:

**Tipografia:**
- `heroTitle`: estilo do título principal (script/serif/bold sans). Que família combina?
- `sectionTitle`: estilo dos títulos de seção
- `body`: fonte de texto corrido (Jost é o padrão)
- Sugerir fontes disponíveis em `assets/config/typography.json`. Se nenhuma servir, sugerir novas do Google Fonts e adicioná-las ao arquivo.

**Espaçamentos:**
- Sensação geral: compacto / equilibrado / arejado
- `sectionPaddingTop`: quanto espaço antes de cada seção (compacto: 60px, equilibrado: 88px, arejado: 112px)
- `sectionPaddingInline`: margem lateral (18px / 24px / 32px)
- `dividerMarginTop`: espaço entre seções (40px / 56px / 72px)

**Bordas:**
- `radius.card`: sharp = 0px, suave = 6px, arredondado = 12px, muito arredondado = 20px
- `radius.button`: idem

**Animação:**
- Sutil (fade simples), moderado (slide + fade), marcante (translate + escala)
- `fadeDuration`: 0.4s / 0.6s / 0.8s

**Estilo visual geral:**
- Nomear com adjetivos: romântico, editorial, rústico, minimalista, luxuoso, etc.

### Passo 3 — Apresentar resumo para aprovação

Apresente os tokens extraídos em formato de tabela clara:

```
Layout detectado: [adjetivo estilo]
────────────────────────────────────
Tipografia
  Hero title  : [fonte sugerida]  ex: 'Playfair Display', serif — peso 700
  Seção title : [fonte sugerida]
  Corpo       : 'Jost', sans-serif — padrão

Espaçamentos
  Seção top   : 88px
  Lateral     : 24px
  Divider     : 56px

Bordas
  Card        : 0px (sharp)
  Botão       : 4px

Animação
  Duração     : 0.6s (moderada)

Nome sugerido: romantic
────────────────────────────────────
```

Pergunte:
1. Os tokens estão corretos ou quer ajustar algum?
2. Qual o nome (slug) do layout? Ex: `romantic`, `rustic`, `bold`

**Aguarde confirmação antes de gerar qualquer arquivo.**

### Passo 4 — Gerar os arquivos

Só execute este passo após aprovação explícita do usuário.

#### 4a. `assets/layouts/{nome}/defaults.json`

Estrutura obrigatória (baseie-se em `assets/layouts/modern/defaults.json` como referência):

```json
{
  "typography": {
    "fonts": {
      "primary": "'Jost', sans-serif",
      "serif":   "'Cormorant Garamond', serif",
      "accent":  "'Great Vibes', cursive"
    },
    "sizes": {
      "sectionTag":   "12px",
      "sectionTitle": { "min": "32px", "fluid": "6vw", "max": "52px" },
      "sectionBody":  "13px"
    },
    "roles": {
      "heroTitle":    { "family": "accent", "size": { "min": "52px", "fluid": "11vw", "max": "96px" }, "weight": 400, "lineHeight": 1.1 },
      "sectionTitle": { "family": "serif",  "size": { "min": "32px", "fluid": "6vw",  "max": "52px" }, "weight": 300, "lineHeight": 1.2 },
      "eyebrow":      { "family": "primary","size": "12px", "weight": 300, "letterSpacing": "0.4em", "textTransform": "uppercase" },
      "body":         { "family": "primary","size": "13px", "weight": 300, "lineHeight": 1.6 },
      "detailValue":  { "family": "serif",  "size": { "min": "18px", "fluid": "3vw", "max": "28px" }, "weight": 300 },
      "footerName":   { "family": "accent", "size": { "min": "28px", "fluid": "5vw", "max": "40px" }, "weight": 400 }
    }
  },
  "spacing": {
    "sectionPaddingTop":    "88px",
    "sectionPaddingInline": "24px",
    "dividerMarginTop":     "56px",
    "countdownMarginTop":   "40px",
    "detailsMarginTop":     "32px",
    "rsvpCardMarginTop":    "32px"
  },
  "layout": {
    "heroHeight":    "100svh",
    "contentMaxWidth": "760px"
  },
  "radius": {
    "card":   "0px",
    "button": "0px"
  },
  "effects": {
    "transition": "all 0.3s ease"
  },
  "animation": {
    "fadeDuration":     "0.6s",
    "staggerDelay":     "0.08s",
    "heroFadeDuration": "1.0s"
  },
  "countdown": {
    "format":         "two-digits",
    "updateInterval": 1000
  },
  "responsive": {
    "mobile": {
      "spacing": {
        "sectionPaddingTop":    "52px",
        "sectionPaddingInline": "20px"
      }
    }
  }
}
```

Adapte todos os valores conforme os tokens aprovados.

#### 4b. `assets/layouts/{nome}/layout.css`

**Regras obrigatórias:**
- Use **exclusivamente** variáveis CSS do sistema. Proibido hardcodar cores.
- Não use `!important` sem justificativa em comentário.
- Use `transition: var(--transition-standard)` para hover e focus.
- Inclua `outline` acessível em elementos focáveis (`outline: 2px solid var(--color-primary-soft); outline-offset: 2px`).

**Variáveis CSS disponíveis:**

*Cores:*
`--color-bg` `--color-surface` `--color-surface-soft`
`--color-primary` `--color-primary-soft` `--color-primary-glow`
`--color-text` `--color-text-muted` `--color-text-soft` `--color-text-dim` `--color-text-faint`
`--color-border` `--color-border-soft` `--color-border-strong`
`--color-gold-surface-soft` `--color-gold-surface` `--color-gold-surface-strong`
`--color-overlay-backdrop`

*Tipografia:*
`--font-primary` `--font-serif` `--font-accent`
`--typo-heroTitle-family` `--typo-heroTitle-size` `--typo-heroTitle-weight` `--typo-heroTitle-lineHeight`
`--typo-sectionTitle-family` `--typo-sectionTitle-size` `--typo-sectionTitle-weight`
`--typo-eyebrow-family` `--typo-eyebrow-size` `--typo-eyebrow-weight` `--typo-eyebrow-letterSpacing` `--typo-eyebrow-textTransform`
`--typo-body-family` `--typo-body-size` `--typo-body-weight` `--typo-body-lineHeight`
`--typo-detailValue-family` `--typo-detailValue-size` `--typo-detailValue-weight`
`--typo-footerName-family` `--typo-footerName-size`
`--section-tag-size` `--section-body-size`
`--section-title-min` `--section-title-fluid` `--section-title-max`

*Espaçamentos:*
`--section-padding-top` `--section-padding-inline` `--divider-margin-top`
`--countdown-margin-top` `--details-margin-top` `--rsvp-card-margin-top`
`--section-tag-gap` `--section-title-gap`
`--space-xs(8px)` `--space-sm(12px)` `--space-md(16px)` `--space-lg(22px)`
`--space-xl(30px)` `--space-2xl(40px)` `--space-3xl(48px)` `--space-4xl(56px)`
`--card-padding(28px)` `--container-width(760px)`

*Layout:*
`--hero-height` `--hero-padding` `--hero-content-width` `--content-max-width`
`--hero-overlay-gradient` `--page-gradient` `--button-fill-gradient`

*Bordas e efeitos:*
`--radius-card` `--radius-button`
`--shadow-soft` `--shadow-hover` `--focus-ring`
`--transition-standard`

*Animação:*
`--fade-duration` `--stagger-delay` `--hero-fade-duration`

**Seções obrigatórias do layout.css** (gere todas):

1. **Reset e base** — `*, body { box-sizing, margin, padding, color, background }`
2. **Intro / Loading screen** — `.intro-screen`, `.intro-card`, `.intro-couple`, `.couple-names`
3. **Hero** — `.hero`, `.hero-photo`, `.hero-content`, `.hero-names`, `.hero-date`, `.hero-label`, `.scroll-hint`
4. **Countdown** — `.countdown-section`, `.countdown-wrap`, `.countdown-card`, `.countdown-num`, `.countdown-label`
5. **Divider** — `.divider`, `.divider-line`, `.divider-diamond`
6. **Detalhes** — `.details-section`, `.details-grid`, `.detail-card`, `.detail-card-link`, `.detail-title`, `.detail-value`, `.detail-sub`, `.detail-link-hint`, `.detail-icon`
7. **Extras** — `.extras-section`, `.extras-grid`, `.extras-card`, `.extras-card-icon`, `.extras-card-title`, `.extras-card-hint`
8. **Presente** — `.gift-page`, `.gift-main`, `.gift-shell`, `.gift-grid`, `.gift-panel`, `.gift-panel-tag`, `.gift-copy-label`, `.gift-back-wrap`, `.gift-back-link`
9. **RSVP** — `.rsvp-shell`, `.rsvp-section`, `.rsvp-title`, `.rsvp-subtitle`, `.rsvp-form`, `.rsvp-field`, `.rsvp-input`, `.rsvp-label`, `.rsvp-choices`, `.rsvp-choice`, `.rsvp-submit`, `.rsvp-success`
10. **Áudio** — `.audio-player`, `.audio-btn`, `.audio-info`
11. **Footer** — `.site-footer`, `.footer-names`, `.footer-note`
12. **Páginas extras (extra-page)** — `.extra-page`, `.extra-header`, `.extra-back`, `.extra-main`, `.extra-intro`, `.extra-content`
13. **Extra info cards** — `.extra-info-card`, `.extra-info-label`, `.extra-info-value`
14. **Traje & Paletas** — `.traje-color-item`, `.traje-swatch`, `.traje-color-name`, `.traje-palette`, `.traje-swatch-item`, `.traje-swatch-label`
15. **Nossa História** — `.historia-timeline`, `.historia-chapter`, `.historia-year`, `.historia-chapter-title`, `.historia-chapter-text`
16. **FAQ** — `.faq-list`, `.faq-item`, `.faq-question`, `.faq-answer`
17. **Mensagem/Música** — `.extra-form-card`, `.extra-form-title`, `.extra-form-field`, `.extra-form-label`, `.extra-form-textarea`, `.extra-form-feedback`
18. **Hospedagem** — `.hospedagem-section`, `.hospedagem-group-title`, `.hospedagem-grid`, `.hospedagem-card`, `.hospedagem-card-name`, `.hospedagem-card-description`, `.hospedagem-card-link`
19. **Galeria** — `.historia-gallery-section`, `.gallery-container`, `.gallery-track` (aspect-ratio: 3/4), `.gallery-slide`, `.gallery-controls` (justify-content: center), `.gallery-nav`, `.gallery-dots`, `.gallery-dot`
20. **Mapa** — `.venue-map-section`, `#map` (height: 360px), `.map-popup`, `.map-popup-name`, `.map-popup-address`, `.map-popup-link`
21. **Responsivo** — `@media (max-width: 900px)`, `@media (max-width: 767px)`, `@media (max-width: 480px)`, `@media (min-width: 768px)` para hovers

**Referência de como usar os layout.css existentes:**
- Leia `assets/layouts/classic/layout.css` para ver o estilo tradicional/romântico
- Leia `assets/layouts/modern/layout.css` para ver o estilo editorial/sans-serif
- Adapte a linguagem visual ao estilo detectado na inspiração

#### 4c. Registrar o layout no dashboard e editor

**`dashboard.html`** — Adicionar `<option>` no select `#edActiveLayout`:
```html
<option value="{nome}">{Nome com maiúscula}</option>
```

**`assets/js/editor.js`** — Adicionar entrada em `LAYOUT_DEFINITIONS`:
```js
{
  key: '{nome}',
  name: '{Nome}',
  description: '{Descrição curta do estilo visual}',
},
```

**`assets/js/dashboard.js`** — Adicionar entry em `LAYOUT_THEMES`:
```js
{nome}: PALETTE_LIST,
```

#### 4d. Se adicionou novas fontes Google

Se as fontes sugeridas não existem em `assets/config/typography.json`, adicione-as:
```json
"nova_fonte": "'Nova Fonte', serif"
```

Verifique também se a fonte está sendo carregada em `assets/css/fonts.css` via `@import url('https://fonts.googleapis.com/css2?family=...')`. Se não estiver, adicione a linha de import.

### Passo 5 — Confirmar e orientar teste

Após gerar os arquivos, informe ao usuário:

1. Quais arquivos foram criados/modificados
2. Como testar: alterar `"activeLayout": "{nome}"` em `assets/config/site.json`
3. Possíveis ajustes esperados após ver no browser (é normal precisar de refinamentos)

---

## Checklist antes de finalizar

- [ ] `assets/layouts/{nome}/defaults.json` criado com todos os tokens
- [ ] `assets/layouts/{nome}/layout.css` criado com todas as 21 seções
- [ ] Nenhuma cor hardcodada no CSS — só `var(--color-*)`
- [ ] `dashboard.html` atualizado com a opção no select
- [ ] `assets/js/editor.js` — `LAYOUT_DEFINITIONS` atualizado
- [ ] `assets/js/dashboard.js` — `LAYOUT_THEMES` atualizado
- [ ] Novas fontes Google adicionadas em `typography.json` e `fonts.css` se necessário
- [ ] `melhorias.md` atualizado com entrada do novo layout
