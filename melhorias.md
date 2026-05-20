# Checklist de Melhorias — Devazi

> Itens ordenados por área. Marque `[x]` quando concluído e `[!]` quando encontrar impedimento.

---

## Bugs críticos

- [x] **B1 — Convite não carrega na primeira abertura após wizard**
  Depois de criar a conta, passar pelo wizard e abrir o convite pela primeira vez, a página não carrega. Atualizar não resolve. Só funciona ao fechar e reabrir o link.
  > Corrigido em `script.js`: detecta fase "couple" da loading screen e chama `onOpen()` diretamente.

- [x] **B2 — Mapa com layout quebrado na página de Hospedagem**
  O mapa aparece visualmente distorcido, cortado ou fora do container.
  > Corrigido em `map.js`: duplo `requestAnimationFrame` após `section.hidden = false` garante que o browser calculou o layout do `#map` antes de o Leaflet medir as dimensões. Altura explícita adicionada ao `#map` em `style.css`.

- [x] **B3 — Música continua tocando ao minimizar o navegador ou trocar de aba**
  O áudio persiste em background mesmo ao sair do navegador ou trocar de aba.
  > Corrigido em `script.js`: listener `visibilitychange` pausa o áudio ao esconder a página e retoma ao voltar; chave `audio-visibility-paused` distingue dessa pausa por navegação entre páginas.

- [x] **B4 — Modal de presente exibe opção de cartão mesmo quando desabilitado**
  Quando o pagamento por cartão não está habilitado, o modal ainda mostra a opção e redireciona para URL aleatória. A opção deve aparecer com **cadeado visual** e sem link clicável.
  > Corrigido em `presente.html`: variável `CARD_ENABLED` sincronizada com `cardPaymentEnabled`; botão exibe 🔒, sem `href` e `pointer-events: none`.

---

## Plano Free — Bloqueios e restrições

- [x] **F1 — Bloquear toggle de Mensagem e Música para usuários free**
  Os toggles ainda ficam selecionáveis no plano free.
  > Corrigido em `dashboard.js`: `applyPlanRestrictions()` chamado dentro de `loadEditorTab()` logo após `renderPagesGrid()`.

- [x] **F2 — Marca d'água em todas as páginas do convite (free)**
  A marca d'água aparecia apenas na página principal.
  > Corrigido: elemento `#devaziWatermark` adicionado ao footer de todas as páginas extras.

---

## Funcionalidades novas

- [x] **N1 — Botão de voltar abaixo do mapa em Hospedagem**
  > Corrigido junto com B2: `gift-back-wrap` movido para após `venueMapSection` em `hospedagem.html`.

- [x] **N2 — Limite de hotéis e restaurantes: máximo 3 de cada**
  > Implementado em `dashboard.js`: botões desabilitados ao atingir 3 itens.

- [x] **N3 — Galeria limitada por quantidade E por tamanho (MB)**
  Upload bloqueado se exceder QUALQUER dos dois limites:
  - **Free:** 3 fotos ou 10 MB
  - **Premium:** 7 fotos ou 30 MB
  > Implementado em `api/dashboard/media.js`: verifica count e size antes de aceitar o upload.

- [x] **N4 — Círculos das paletas de padrinhos perfeitos no mobile**
  Círculos ficavam levemente elípticos em telas pequenas.
  > Causa raiz: `min-width: 56px` da media query sobrescrevia `width: 48px` (CSS `min-width` é constraint, sempre vence `width`). Corrigido com `min-width: 0; aspect-ratio: 1/1` em `.traje-swatch-item .traje-swatch`.

- [x] **N5 — Validação de senha forte na criação de conta**
  > Implementado em `signup.html`: indicador de força (3 barras), campo "Confirmar senha" e bloqueio de envio.

- [x] **N6 — Pix como método de pagamento no checkout de upgrade**
  > Corrigido em `api/payments.js`: usa `automatic_payment_methods: { enabled: true }` em vez de lista explícita. **Para ativar Pix:** habilitar em Stripe Dashboard → Settings → Payment methods. O Pix aparecerá automaticamente quando condições forem atendidas (conta BRL + Pix habilitado).

---

## Decisões pendentes

- [x] **D1 — Comportamento do áudio ao retornar para a página principal**
  > Decisão: retoma automaticamente ao voltar (via bfcache ou visibilitychange), somente se a pausa foi causada pela navegação — pausa manual do usuário é preservada.
