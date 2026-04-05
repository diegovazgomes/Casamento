# Guia de tema

## Visão geral

O projeto usa um tema em JSON para controlar a identidade visual principal do convite.

O fluxo é este:

1. O arquivo de tema é carregado em [assets/js/script.js](../assets/js/script.js).
2. O tema é mesclado com `DEFAULT_THEME`, que funciona como fallback local.
3. A função `applyTheme(theme)` transforma os valores do JSON em CSS variables no `:root`.
4. O CSS usa essas variáveis com `var(...)`.

Isso permite trocar o visual do site alterando apenas o arquivo de tema, sem mudar a estrutura do HTML.

## Onde ficam os temas

- Tema padrão: [assets/config/themes/classic-gold.json](../assets/config/themes/classic-gold.json)
- Tema de exemplo claro: [assets/config/themes/modern-light.json](../assets/config/themes/modern-light.json)

## Como trocar de tema

O carregamento padrão fica em [assets/js/script.js](../assets/js/script.js).

Hoje o arquivo usa a constante `ACTIVE_THEME_PATH`.

Exemplo:

```js
const ACTIVE_THEME_PATH = 'assets/config/themes/classic-gold.json';
```

Para testar outro tema, troque para:

```js
const ACTIVE_THEME_PATH = 'assets/config/themes/modern-light.json';
```

Também é possível chamar:

```js
loadTheme('assets/config/themes/classic-gold.json')
```

## Limite de responsabilidade do tema

O tema controla a identidade visual e os espaçamentos principais.

Ficam no tema:

- cores
- tipografia
- largura máxima principal
- padding vertical principal de seção
- padding interno principal de cards
- sombras, gradientes, transições e duração base de animação

Podem continuar no CSS:

- gaps menores
- offsets locais
- pequenos ajustes por breakpoint
- detalhes estruturais de layout

Isso evita excesso de `calc()` e mantém o código mais claro.

## Grupos do tema

### `colors`

Controla as cores base do site, superfícies, textos, bordas e estados visuais.

### `typography`

Controla as famílias tipográficas principais do projeto.

### `spacing`

Controla os espaçamentos principais do layout.

### `radius`

Controla o arredondamento de cards e botões.

### `effects`

Controla sombras, gradientes, transições e efeitos de profundidade.

### `animation`

Controla a duração base de fades e o atraso base de revelação.

## Propriedades

## colors.background
Cor de fundo principal da página.
Usada no fundo geral do site e como base do tema no carregamento inicial.

## colors.surface
Cor base das superfícies internas.
Usada em cards de detalhes e blocos com fundo sólido.

## colors.surfaceSoft
Superfície translúcida leve.
Usada em campos, QR frame e brilhos leves sobre o layout.

## colors.primary
Cor principal de destaque.
Usada em botões, títulos auxiliares, linhas decorativas e elementos interativos.

## colors.primarySoft
Cor de destaque secundária.
Usada em acentos suaves, textos de apoio e estados visuais mais delicados.

## colors.text
Cor principal do texto.
Usada no texto base claro ou escuro, dependendo do tema.

## colors.textMuted
Texto secundário padrão.
Usada em descrições curtas, labels auxiliares e informações menos prioritárias.

## colors.textSoft
Texto de apoio com contraste intermediário.
Usada em parágrafos de introdução, gift text e blocos explicativos.

## colors.textDim
Texto mais discreto.
Usada em subtítulos pequenos e detalhes complementares.

## colors.textFaint
Texto bem suave.
Usada em notas de rodapé e informações de menor peso visual.

## colors.textPlaceholder
Cor dos placeholders dos inputs.
Usada no formulário de RSVP.

## colors.border
Borda principal suave.
Usada em cards, painéis, blocos do countdown e overlay.

## colors.borderSoft
Borda ainda mais leve.
Usada em superfícies delicadas, como intro card e QR frame.

## colors.borderStrong
Borda com mais contraste.
Usada em foco, links e botões que precisam mais definição.

## colors.goldSurfaceSoft
Fundo de destaque muito suave.
Usada nos cards do countdown e em superfícies com brilho discreto.

## colors.goldSurface
Fundo de destaque suave.
Usada em camadas de gradiente e efeitos internos de painéis.

## colors.goldSurfaceStrong
Fundo de destaque mais evidente.
Usada na grade de detalhes e em áreas que precisam separação maior.

## colors.primaryGlow
Brilho principal do tema.
Usada em fundos radiais no body e na intro.

## colors.pageGridLine
Cor do grid decorativo de fundo.
Usada no padrão de linhas do fundo da página.

## colors.overlayBackdrop
Escurecimento atrás de overlays.
Usada no fundo do modal de presentes.

## colors.audioPanelBg
Fundo do botão flutuante de áudio.
Usada no estado normal do controle de áudio.

## colors.audioPanelHoverBg
Fundo do botão de áudio no hover.
Usada quando o usuário interage com o controle de áudio.

## colors.audioPanelBorder
Borda do botão de áudio.
Usada para destacar o controle no canto da tela.

## colors.pulseRing
Cor do anel animado do áudio.
Usada no efeito de pulso quando o áudio está ativo.

## colors.pulseRingSpread
Fim transparente do anel do áudio.
Usada no frame expandido da animação de pulso.

## colors.inputFocusBg
Fundo do input em foco.
Usada no RSVP para dar destaque ao campo ativo.

## typography.fontPrimary
Fonte base do projeto.
Usada no body, nos textos corridos e na maior parte da interface.

## typography.fontSerif
Fonte serifada principal.
Usada em títulos, números elegantes e blocos de destaque.

## typography.fontAccent
Fonte de assinatura.
Usada principalmente nos nomes dos noivos e elementos caligráficos.

## spacing.sectionPadding
Padding vertical principal das seções.
Usada em `.content-section` e nas áreas principais do fluxo da página.

## spacing.containerWidth
Largura máxima central do conteúdo.
Usada no container principal das seções para limitar a largura do layout.

## spacing.cardPadding
Padding interno principal de cards.
Usada hoje nos cards de detalhes e como referência para blocos compartilhados.

## radius.card
Arredondamento dos cards e painéis.
Usada em cards, countdown, overlays e blocos visuais equivalentes.

## radius.button
Arredondamento dos botões.
Usada nos botões principais, links com aparência de botão e ações do overlay.

## effects.shadowSoft
Sombra base de profundidade.
Usada em painéis como intro, presentes e overlay.

## effects.shadowHover
Sombra de hover.
Usada em cartões e elementos que sobem levemente na interação.

## effects.textShadowStrong
Sombra forte para texto.
Usada em títulos sobre imagem e elementos de grande destaque.

## effects.textShadowSoft
Sombra suave para texto.
Usada em textos sobre áreas com contraste mais delicado.

## effects.focusRing
Anel de foco de acessibilidade.
Usada em estados `:focus-visible`.

## effects.transition
Transição padrão global.
Usada em botões, links e estados interativos compartilhados.

## effects.pageGradient
Gradiente principal do fundo da página.
Usada no body como base do visual geral.

## effects.introBackdropGradient
Gradiente da tela de abertura.
Usada no fundo da intro antes da entrada no convite.

## effects.introCardGradient
Gradiente do card da intro.
Usada no painel central da tela inicial.

## effects.buttonFillGradient
Gradiente interno dos botões em hover.
Usada no preenchimento animado dos botões principais.

## effects.heroOverlayGradient
Overlay do hero.
Usada sobre a imagem principal para garantir legibilidade do texto.

## effects.overlayPanelGradient
Gradiente do painel de overlay.
Usada no modal de presentes.

## effects.overlayCloseGradient
Gradiente da faixa de fechamento do overlay.
Usada na área superior do botão de fechar.

## effects.rsvpPanelGradient
Gradiente do bloco RSVP.
Usada no card principal do formulário.

## effects.giftPanelGradient
Gradiente dos painéis de presente.
Usada nos blocos principais da área de presentes.

## animation.fadeDuration
Duração base de fade e transição.
Usada em entradas visuais, overlays e transições compartilhadas do tema.

## animation.staggerDelay
Atraso base entre elementos revelados em sequência.
Usada nas entradas escalonadas de seções como countdown e detalhes.