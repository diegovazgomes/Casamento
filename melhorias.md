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

- [ ] **B5 — Corrigir paletas do noivo e da noiva em Traje**
  Após o ajuste dos círculos de padrinhos e madrinhas (mobile), os círculos das paletas do **noivo** e da **noiva** ficaram visualmente bugados. É necessário padronizar para círculos perfeitos (sem deformação elíptica), mantendo consistência entre todos os blocos de paleta.

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

- [ ] **N7 — Redesign da galeria para formato retrato (mobile-first)**
  A galeria atual usa cards quadrados. Precisamos redesenhar para proporção de foto em retrato (mais comum em celulares), com redimensionamento responsivo e boa composição visual no desktop e no mobile.

---

## Documentação técnica

- [x] **T1 — Reposicionar o CLAUDE.md para refletir a fase atual do produto**
  O `docs/CLAUDE.md` hoje descreve bem o subsistema do convite público, mas não representa mais o projeto como um todo. A nota atual é **4/10**, porque o documento ainda enquadra a base como site estático, enquanto o repositório já opera como plataforma SaaS em evolução.
  > Corrigido em `docs/CLAUDE.md`: abertura e visão geral reescritas para explicitar as duas camadas do produto: **plataforma SaaS** e **experiência pública do convite**.

- [x] **T2 — Documentar a arquitetura SaaS que já existe no repositório**
  Faltam no `docs/CLAUDE.md` os fluxos e componentes centrais já presentes no projeto, como `dashboard.html`, `signup.html`, `landing.html`, a pasta `api/` e a autenticação com Supabase.
  > Corrigido em `docs/CLAUDE.md`: adicionadas seções para dashboard, autenticação, onboarding, rotas serverless, resolução por slug e ponte entre SaaS e convite público.

- [x] **T3 — Atualizar o pipeline real de bootstrap e carregamento de configuração**
  A documentação ainda está centrada demais em configuração local via `site.json`, mas o runtime atual já usa resolução por slug e API.
  > Corrigido em `docs/CLAUDE.md`: bootstrap atualizado com `assets/js/config-source.js`, `assets/js/loading-screen.js`, carga por `/api/event-config` e fallback controlado via `site.json`/defaults.

- [x] **T4 — Corrigir inventário de páginas, módulos e estrutura do projeto**
  O inventário atual está incompleto para a fase do produto e omite páginas e módulos que hoje são estruturais.
  > Corrigido em `docs/CLAUDE.md`: estrutura de pastas e seção de páginas agora incluem superfícies SaaS/comerciais, páginas legais e módulos centrais como `assets/js/dashboard.js`.

- [x] **T5 — Atualizar a seção de stack e testes para o estado real do repositório**
  A seção de testes está subdimensionada e o stack descrito não cobre mais o projeto atual.
  > Corrigido em `docs/CLAUDE.md`: stack local/serverless e cobertura de testes revisados com base em `package.json`, `tests/integration/` e `tests/unit/`.

---

## Decisões pendentes

- [x] **D1 — Comportamento do áudio ao retornar para a página principal**
  > Decisão: retoma automaticamente ao voltar (via bfcache ou visibilitychange), somente se a pausa foi causada pela navegação — pausa manual do usuário é preservada
