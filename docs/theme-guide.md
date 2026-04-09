# Guia de tema

## Visão geral

Cada tema é um arquivo JSON autossuficiente em `assets/config/themes/`. Para trocar o visual do site basta alterar `ACTIVE_THEME_PATH` em `assets/js/script.js` — nenhum outro arquivo precisa ser tocado.

O fluxo em runtime:

1. `loadTheme()` carrega o JSON e faz merge com `DEFAULT_THEME` (fallback embutido no `script.js`)
2. `resolveTheme()` verifica o viewport. Se for mobile (≤ 767px), aplica o bloco `responsive.mobile` sobre o tema base
3. `applyTheme()` escreve todos os valores como CSS custom properties no `:root`
4. O CSS usa apenas `var(--...)` — nenhum valor hardcoded

## Como trocar de tema

Em `assets/js/script.js`, altere apenas esta linha:

```js
const ACTIVE_THEME_PATH = 'assets/config/themes/classic-gold.json';
```

Temas disponíveis: `classic-gold.json`, `classic-silver.json`.

## Overrides de cor via editor (site.json)

Além dos arquivos de tema, o projeto permite sobrescrever cores diretamente em `site.json`, no bloco `themeOverrides.colors`. Esses valores são aplicados em runtime por merge sobre o tema ativo.

Exemplo mínimo:

```json
{
  "themeOverrides": {
    "colors": {
      "background": "#111111",
      "primary": "#d4af37"
    }
  }
}
```

### Como funciona a precedência

1. Tema base carregado em `assets/config/themes/*.json`
2. Overrides de `site.json` em `themeOverrides.colors`
3. Fallback para defaults quando uma chave não existe

Resumo: se a chave existir em `themeOverrides.colors`, ela ganha do tema base.

### Chaves usadas no editor de Tema

- `background`
- `surface`
- `primary`
- `primarySoft`
- `text`
- `textMuted`
- `textFaint`
- `border`
- `borderSoft`
- `overlayBackdrop`
- `inputFocusBg`
- `pageGridLine`
- `audioPanelBg`
- `audioPanelHoverBg`
- `audioPanelBorder`

Compatibilidade legada já suportada em runtime:

- `audioButtonBg` é tratado como alias de `audioPanelBg`
- `audioButtonBorder` é tratado como alias de `audioPanelBorder`
- `inputBorderFocus` é tratado como alias de `inputFocusBg`

### Escala e manutenção

No editor, os campos de cor são orientados a dados em uma estrutura única (`THEME_COLOR_SECTIONS`), facilitando expansão sem duplicar HTML de formulário.

Para adicionar uma nova cor no editor:

1. Adicionar o token no tema (`assets/config/themes/*.json`) e no default de tema
2. Garantir mapeamento em `applyTheme()` (`assets/js/script.js`)
3. Adicionar um item em `THEME_COLOR_SECTIONS` (`assets/js/editor.js`)
4. Validar no `site-schema.json` se necessário
5. Rodar smoke tests

### Checklist de commit (tema/cores)

1. Validar alteração visual na home e em uma página extra
2. Exportar e reimportar `site.json` pelo editor
3. Confirmar que campo limpo volta a herdar do tema base
4. Rodar `npm test`
5. Atualizar `ROADMAP.md` quando houver novo escopo funcional

## Como criar um novo tema

1. Duplique `classic-gold.json` e renomeie
2. Altere os valores desejados
3. Aponte `ACTIVE_THEME_PATH` para o novo arquivo

O bloco `responsive.mobile` só precisa conter as propriedades que diferem do desktop — o resto é herdado.

## Estrutura do arquivo de tema

```json
{
  "meta": { "name": "...", "description": "..." },
  "colors": { ... },
  "typography": {
    "fonts": { "primary", "serif", "accent" },
    "sizes": { ... }
  },
  "spacing": { ... },
  "layout": { ... },
  "components": { ... },
  "radius": { "card", "button" },
  "effects": { ... },
  "animation": { ... },
  "countdown": { "format", "updateInterval" },
  "responsive": {
    "mobile": { ... sobreposições para viewport ≤ 767px ... }
  }
}
```

---

## Referência de propriedades

### `colors`

| Propriedade | CSS var | Onde é usada |
|---|---|---|
| `background` | `--color-bg` | Fundo geral da página |
| `surface` | `--color-surface` | Cards de detalhes, blocos com fundo sólido |
| `surfaceSoft` | `--color-surface-soft` | Campos, QR frame, brilhos leves |
| `primary` | `--color-primary` | Botões, títulos auxiliares, linhas decorativas |
| `primarySoft` | `--color-primary-soft` | Acentos suaves, textos de apoio |
| `primaryGlow` | `--color-primary-glow` | Fundos radiais no body e na intro |
| `text` | `--color-text` | Texto principal |
| `textMuted` | `--color-text-muted` | Labels auxiliares, descrições curtas |
| `textSoft` | `--color-text-soft` | Parágrafos de introdução, gift text |
| `textDim` | `--color-text-dim` | Subtítulos pequenos, detalhes complementares |
| `textFaint` | `--color-text-faint` | Notas de rodapé |
| `textPlaceholder` | `--color-text-placeholder` | Placeholder dos inputs do RSVP |
| `border` | `--color-border` | Cards, painéis, countdown, overlay |
| `borderSoft` | `--color-border-soft` | Superfícies delicadas, intro card, QR frame |
| `borderStrong` | `--color-border-strong` | Foco, links, botões com mais definição |
| `goldSurfaceSoft` | `--color-gold-surface-soft` | Cards do countdown, brilho discreto |
| `goldSurface` | `--color-gold-surface` | Camadas de gradiente, efeitos internos |
| `goldSurfaceStrong` | `--color-gold-surface-strong` | Grade de detalhes |
| `overlayBackdrop` | `--color-overlay-backdrop` | Fundo do modal de presentes |
| `audioPanelBg` | `--color-audio-bg` | Botão flutuante de áudio (normal) |
| `audioPanelHoverBg` | `--color-audio-hover-bg` | Botão de áudio no hover |
| `audioPanelBorder` | `--color-audio-border` | Borda do controle de áudio |
| `pulseRing` | `--color-pulse-ring` | Anel animado quando o áudio está ativo |
| `inputFocusBg` | `--color-input-focus-bg` | Fundo do input em foco no RSVP |

### `typography.fonts`

| Propriedade | CSS var | Onde é usada |
|---|---|---|
| `primary` | `--font-primary` | Body, textos corridos, interface geral |
| `serif` | `--font-serif` | Títulos, números elegantes, destaques |
| `accent` | `--font-accent` | Nomes dos noivos, elementos caligráficos |

### `typography.sizes`

Todos os tamanhos usam strings com unidade (`"13px"`, `"7vw"`). Os valores fluidos (`heroNames`, `sectionTitle`) aceitam `{ "min", "fluid", "max" }` para `clamp()`.

### `spacing`

Padding de seção, gaps entre componentes, margens internas de cards RSVP, etc. Todos os valores são strings com unidade (`"88px"`).

### `layout`

| Propriedade | CSS var | Onde é usada |
|---|---|---|
| `heroHeight` | `--hero-height` | Altura do hero |
| `heroPadding` | `--hero-padding` | Padding completo do hero |
| `heroContentWidth` | `--hero-content-width` | Largura máxima do bloco textual do hero |
| `heroContentPaddingBottom` | `--hero-content-padding-bottom` | Espaço inferior do conteúdo do hero |
| `heroFadeOffset` | `--hero-fade-offset` | Deslocamento inicial antes do fade de entrada |
| `contentMaxWidth` | `--content-max-width` | Largura máxima do conteúdo interno das seções |

### `components`

Tamanhos específicos de componentes: seta de scroll, cards do countdown, inputs e botões do RSVP.

### `radius`

| Propriedade | CSS var | Onde é usada |
|---|---|---|
| `card` | `--radius-card` | Cards, painéis, countdown, overlays |
| `button` | `--radius-button` | Botões principais e ações do overlay |

Use `"0px"` para estilo reto (padrão dos temas atuais) ou valores como `"8px"` para arredondado.

### `effects`

Sombras (`shadowSoft`, `shadowHover`), sombras de texto, anel de foco, transição padrão, e todos os gradientes de fundo, hero, intro, botão, overlay, RSVP e presente.

### `animation`

| Propriedade | CSS var / JS | Descrição |
|---|---|---|
| `fadeDuration` | `--fade-duration` | Duração base de fades gerais da UI |
| `staggerDelay` | `--stagger-delay` | Atraso entre elementos revelados em sequência |
| `heroFadeDuration` | `--hero-fade-duration` | Duração do fade de entrada do hero |
| `heroRevealDelayMs` | JS (`WeddingApp`) | Delay em ms antes da revelação do texto do hero |

### `countdown`

| Propriedade | Descrição |
|---|---|
| `format` | `"two-digits"` exibe sempre 2 dígitos (ex: `04`, `09`) |
| `updateInterval` | Intervalo de atualização em milissegundos |

### `responsive.mobile`

Bloco de overrides aplicados quando `window.matchMedia('(max-width: 767px)')` for verdadeiro. Aceita qualquer subconjunto das seções acima. Os valores ausentes são herdados do tema base.

Diferenças típicas entre desktop e mobile:
- `typography.sizes`: `base`, `heroDate`, `heroNames`
- `spacing`: `sectionPaddingTop`, `sectionPaddingInline`, `detailsSectionPaddingTop`
- `layout`: `heroHeight`, `heroPadding`, `heroContentWidth`, `heroFadeOffset`, `contentMaxWidth`
- `animation`: `heroFadeDuration`, `heroRevealDelayMs`
