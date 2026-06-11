# Checklist de Melhorias — Devazi

- [x] **P2 â€” Campo de cupom digitÃ¡vel no Stripe Checkout do upgrade**
  O checkout de upgrade jÃ¡ era aberto pela pÃ¡gina hospedada do Stripe, mas a sessÃ£o nÃ£o habilitava a entrada de cÃ³digo promocional. Sem essa flag, cupons e promotion codes criados no dashboard nÃ£o aparecem para o usuÃ¡rio.
  > Corrigido em `api/payments.js`: adicionada a flag `allow_promotion_codes: true` na criaÃ§Ã£o da `checkout.session`. Implementado em 28/05/2026.
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

- [x] **B6 — Texto de indisponibilidade do cartão aparecia mesmo com link configurado**
  A página de presentes mantinha a cópia "Em breve, esta opção estará disponível." mesmo quando o cartão estava habilitado e com link válido, porque o texto vinha de fallback antigo e a regra de exibição estava diferente da home.
  > Corrigido em `assets/js/script.js`, `presente.html` e `assets/config/defaults/site.json`: o cartão agora só aparece com `cardPaymentEnabled === true` e URL HTTP/HTTPS válida, e o corpo do bloco troca automaticamente para uma mensagem compatível com a opção ativa.

- [x] **B5 — Corrigir paletas do noivo e da noiva em Traje**
  Após o ajuste dos círculos de padrinhos e madrinhas (mobile), os círculos das paletas do **noivo** e da **noiva** ficaram visualmente bugados. É necessário padronizar para círculos perfeitos (sem deformação elíptica), mantendo consistência entre todos os blocos de paleta.
  > Corrigido em `layout.css`: `.traje-color-item .traje-swatch` recebia `width:56px` da media query mas mantinha `height:44px` — `aspect-ratio:1/1` não tem efeito com duas dimensões explícitas. Adicionado `height:auto` para que o aspect-ratio compute a altura a partir da largura. Confirmado 56×56px no mobile via preview.

---

## Plano Free — Bloqueios e restrições

- [x] **F1 — Bloquear toggle de Mensagem e Música para usuários free**
  Os toggles ainda ficam selecionáveis no plano free.
  > Corrigido em `dashboard.js`: `applyPlanRestrictions()` chamado dentro de `loadEditorTab()` logo após `renderPagesGrid()`.

- [x] **F2 — Marca d'água em todas as páginas do convite (free)**
  A marca d'água aparecia apenas na página principal.
  > Corrigido: elemento `#devaziWatermark` adicionado ao footer de todas as páginas extras.

- [x] **F3 — Convites (grupo/individual) bloqueados no Free + botão copiar link geral**
  No Free, criar grupo e criar convite individual ainda geravam fluxo inconsistente (UI parcial + erro 403). Também faltava uma ação simples para copiar apenas o link do convite e colar manualmente para convidados.
  > Corrigido em `dashboard.js` e `dashboard.html`: bloqueio com CTA de upgrade para **Novo grupo** e **Criar convite individual**, tabela de convites em modo somente leitura no Free para grupos legados, tratamento amigável de `upgrade_required` e novo botão de topo **Copiar link do convite** (sem `?g=token`). Implementado em 23/05/2026.

- [x] **F4 — Botão "Copiar texto" na tabela bloqueado sem telefone**
  O botão que copia o texto do convite ficava desabilitado quando o grupo não tinha telefone cadastrado. A função `copyInviteWhatsAppMessage` não depende do telefone, apenas o botão de envio por WhatsApp depende.
  > Corrigido em `dashboard.js`: removidas as classes `phoneDisabledAttr` e `phoneDisabledClass` do botão "Copiar texto". Somente o botão "Convidar" (envio por WhatsApp) continua dependendo do telefone. Implementado em 23/05/2026.

- [x] **F5 — Premium aparece como Free ao abrir a aba Convites pela primeira vez**
  Condição de corrida: `loadGrupos()` era chamado antes de `fetchUserProfile()` terminar, então `state.userProfile` era `null` e a tabela renderizava com restrições de plano Free. Após criar ou editar um grupo, o perfil já estava no cache e funcionava corretamente.
  > Corrigido em `dashboard.js`: adicionado `if (!state.userProfile) await fetchUserProfile()` antes de calcular `isFreePlan` em `loadGrupos()`. Implementado em 23/05/2026.

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

- [x] **N7 — Redesign da galeria para formato retrato (mobile-first)**
  A galeria atual usa cards quadrados. Precisamos redesenhar para proporção de foto em retrato (mais comum em celulares), com redimensionamento responsivo e boa composição visual no desktop e no mobile.
  > Corrigido em `layout.css`: `.gallery-track` alterado de `aspect-ratio:4/3` para `3/4` em todos os breakpoints. Verificado via preview: mobile 343×457px (ratio 0.750), desktop 396×528px (ratio 0.750).

- [x] **N8 — Botões da topbar de Convites quebram texto no mobile**
  Os três botões ("Novo grupo", "Criar convite individual", "Copiar link do convite") ficavam espremidos lado a lado em telas pequenas, quebrando ou cortando o texto.
  > Corrigido em `dashboard.html` (CSS ≤560px): `flex-direction:column` no `.topbar-actions`, cada botão com `width:100%` e label completo visível. No desktop permanecem lado a lado. Implementado em 23/05/2026.

- [x] **N9 — Feedback visual excessivo no botão "Copiar link do convite"**
  O botão grande da topbar mostrava um checkmark SVG e mudava cor/borda ao copiar, igual aos ícones pequenos da tabela — visual pesado para um botão de destaque.
  > Corrigido em `dashboard.js`: `copyGeneralInviteLink` agora troca apenas o texto do span `.btn-label` para "Link copiado" por 2 segundos e restaura o original. Sem ícone, sem mudança de cor. Implementado em 23/05/2026.

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

---

## Próximos pontos de melhoria

- [x] **A1 — Separação de Layouts e Paletas de Cores**
  O sistema de temas misturava tipografia/espaçamentos do layout com paletas de cores, impedindo reutilização de temas entre layouts. Cada novo layout exigiria recriar todos os arquivos de tema (2 layouts × 7 temas = 14 arquivos, escalando linearmente).
  > Implementado em 23/05/2026:
  > - Criados `assets/themes/` com 7 paletas compartilhadas (gold, gold-light, silver, silver-light, purple, blue, green-light) — cada uma contém apenas `colors` e `effects` derivados da cor.
  > - Criados `assets/layouts/classic/defaults.json` e `assets/layouts/modern/defaults.json` com tipografia, espaçamentos, radius e animação específicos de cada layout.
  > - Bootstrap atualizado (`script.js` + `config-source.js`): merge em 3 camadas — system defaults ← layout defaults ← paleta de cor ← site overrides.
  > - `site.json.activeTheme` agora usa chave simples `"gold"` em vez de caminho completo; retrocompatibilidade mantida para paths `assets/layouts/*/themes/` legados.
  > - Editor visual (`editor.js`): catálogo de temas lê de `assets/themes/` (compartilhado entre layouts); modern layout reabilitado no seletor.
  > - Dashboard (`dashboard.js`, `dashboard.html`): lista de paletas unificada, seletor de layout inclui Modern, wizard usa novas chaves.
  > - Resultado: novo layout = apenas `layout.css` + `defaults.json`; todos os temas funcionam automaticamente.

- [x] **P1 — Verificar limite de 50 confirmações no Free**
  O limite de 50 confirmações para contas Free estava implementado corretamente na API (`api/submissions.js`: `checkRsvpLimit()`, HTTP 429, `code: 'RSVP_LIMIT_REACHED'`), mas o frontend não tratava esse código — o convidado via a mensagem genérica de erro de rede em vez de uma mensagem clara.
  > Corrigido em `assets/js/rsvp.js`: adicionada constante `RSVP_LIMIT_REACHED_CODE` e bloco de tratamento específico no fluxo de submit. Quando o limite é atingido, o convidado vê "Confirmações encerradas. Este evento já atingiu o limite de confirmações disponíveis. Entre em contato com os noivos para mais informações." Implementado em 23/05/2026.


- [x] **B7 — Texto padrão opcional no convite de WhatsApp**
  O painel agora permite restaurar o texto padrão dos convites individual e em grupo com um checkbox, e a quantidade de pessoas passou a aparecer sempre como observação fixa no final da mensagem.
