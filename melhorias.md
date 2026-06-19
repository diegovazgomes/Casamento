# Correções recentes

- 2026-06-19: Corrigido preenchimento preso no botao de salvar do dashboard.
  - Causa: apos o clique, o cursor permanecia sobre o botao e o hover mantinha o pseudo-elemento dourado preenchido, parecendo que o botao continuava carregando.
  - Mudanca aplicada: o salvamento aplica texto contrastante assim que a barra comeca a carregar, mantem a mensagem de "salvo" e recolhe apenas o preenchimento do botao 1500ms apos o sucesso.
  - Impacto percebido: apos salvar o evento, a confirmacao permanece visivel e o botao volta ao visual normal sem esconder o texto durante a animacao.

- 2026-06-19: Ocultado temporariamente o exemplo Editorial da landing.
  - Causa: o layout Editorial ainda esta em teste visual e nao deve aparecer por enquanto na vitrine publica de exemplos.
  - Mudanca aplicada: removidos da landing o slide, o dot e o painel de info do exemplo Editorial; o titulo da secao passou de quatro para tres formas.
  - Impacto percebido: a landing volta a mostrar apenas Classico, Minimalista e Moderno enquanto o Editorial segue disponivel no convite/painel.

- 2026-06-19: Corrigido carrossel de exemplos de layout na landing.
  - Causa: o preview `Editorial` tinha `display:flex` direto em `.direcao-screen--editorial`, sobrescrevendo o `display:none` base do carrossel e deixando a tela editorial sempre visivel.
  - Mudanca aplicada: o display flex foi movido para `.direcao-screen--editorial.is-active`, mantendo o editorial oculto quando outro exemplo esta selecionado.
  - Impacto percebido: os exemplos Classico, Minimalista, Moderno e Editorial voltam a alternar corretamente na vitrine da landing.

- 2026-06-19: Preview do convite passou a renderizar a hero real do layout.
  - Causa: a prévia anterior mostrava imagem e tipografia, mas não respeitava fielmente a estrutura visual da hero de cada layout.
  - Mudança aplicada: o dashboard agora usa Shadow DOM isolado com o HTML real da hero, `assets/css/style.css`, o CSS do layout ativo e variáveis CSS do tema/configuração atual; o preview força `.site-shell.is-visible` para evitar a piscada causada pelo estado inicial invisível do convite.
  - Impacto percebido: a escolha de layout e tema mostra uma prévia muito mais próxima do convite publicado, sem salvar alterações automaticamente.

- 2026-06-18: Adicionada prévia da hero no dashboard para layout e tema.
  - Causa: a escolha de layout e tema exigia salvar/aplicar antes de visualizar a capa do convite com os dados reais do casal.
  - Mudança aplicada: a seção `Tema & Visual` ganhou botão de prévia que monta a hero com layout, tema, foto, nomes e data atuais do editor, sem salvar alterações nem alterar o convite público.
  - Impacto percebido: o casal consegue comparar rapidamente o visual da hero antes de publicar, inclusive com ajustes responsivos no dashboard mobile.

- 2026-06-18: Ajuste fino em presentes mobile e observação de traje no layout `editorial`.
  - Causa: emoji dos presentes ficava pequeno para a caixa no mobile e a observação da página de traje herdava a fonte serifada grande dos valores principais.
  - Mudanca aplicada: emoji dos cards de presentes ampliado, com caixa mais alta no mobile, e `#trajeNote` passou a usar Jost/texto corrido com peso leve e linha arejada.
  - Impacto percebido: presentes ficam mais proporcionais no mobile e a observação de traje fica mais limpa, legível e menos parecida com título.

- 2026-06-18: Ajustado layout `editorial` apos nova revisao mobile e desktop.
  - Causa: hero ainda tinha linhas horizontais extras, texto de catalogo aparecia no mobile, icones de presentes estavam ocultos, divisores de paginas extras tinham respiro irregular e o feedback do RSVP nao era exibido pelo estado usado no JS
  - Mudanca aplicada: removidas as reguas da hero, nav desktop afastada do botao de som, emojis dos presentes reexibidos, listras herdadas dos cards de presentes anuladas, texto auxiliar da lista oculto no mobile, divisores de historia/hospedagem redistribuidos, termos do footer sem uppercase forcado e `.rsvp-success.show` suportado no layout.
  - Impacto percebido: a capa fica mais limpa, presentes voltam a ter referencia visual, paginas extras ganham ritmo mais uniforme e o envio do RSVP passa a mostrar retorno visual corretamente.

- 2026-06-18: Refinado layout `editorial` após revisão visual.
  - Causa: prints mostraram excesso de rótulos editoriais no hero, emojis quebrando a sofisticação, footer desalinhado e cards de presentes com botões em alturas diferentes.
  - Mudança aplicada: removidos `THE WEDDING ISSUE` e `ISSUE 01`, foto do hero reenquadrada, scroll hint alinhado com intenção visual, emojis ocultos, footer centralizado, páginas extras ajustadas e cards de presentes equalizados.
  - Impacto percebido: o layout fica mais limpo, menos decorativo e mais premium, com melhor consistência entre hero, presentes e páginas extras.

- 2026-06-18: Adicionado layout `editorial` inspirado em revista premium.
  - Causa: solicitação de novo layout completo "Editorial Magazine" para convites com cara de edição especial.
  - Mudança aplicada: criados `assets/layouts/editorial/defaults.json` e `assets/layouts/editorial/layout.css`, com registro em `dashboard.html`, `assets/js/editor.js`, `assets/js/dashboard.js` e `landing.html`.
  - Impacto percebido: o convite ganha hero assimétrico de capa editorial, tipografia serifada forte, seções arejadas, cards retos e tratamento visual discreto em RSVP, presentes e páginas extras.

- 2026-06-18: Removida foto de perfil do casal da sidebar do dashboard.
  - Causa: solicitação do usuário para simplificar a UI da sidebar, removendo elemento visual desnecessário.
  - Mudança aplicada: removido `<img class="sidebar-profile-photo">` de `dashboard.html`, CSS da classe `.sidebar-profile-photo` de `dashboard.html`, função `renderProfilePhoto()` de `assets/js/dashboard.js` e chamada de função em `renderPlanBadge()`.
  - Impacto percebido: sidebar fica mais limpa mantendo label "Dashboard", nomes do casal e data do casamento. Sem quebra de layout ou responsividade.

- 2026-06-18: Corrigido bloqueio do botão de som no canto superior direito (desktop e mobile) quando o layout ativo era minimal.
  - Causa raiz: a faixa completa da navegação fixa no topo interceptava clique/toque na área vazia da nav, impedindo o evento no botão de áudio.
  - Correção aplicada: a camada `.site-nav` passou a ignorar ponteiro por padrão e apenas elementos interativos da navegação (`a`, `button`, `input`, etc.) continuam clicáveis.
  - Impacto percebido: botão de som volta a pausar/retomar áudio imediatamente sem perder a navegação por links.

- 2026-06-18: Corrigido reinício indevido do áudio no desktop ao entrar em páginas extras.
  - Causa raiz: ao navegar para páginas extras, o áudio era pausado no unload, mas o próximo bootstrap podia retomar automaticamente a trilha.
  - Correção aplicada: no desktop, clique de navegação para páginas extras agora pausa o áudio antes da troca de página e persiste estado pausado da sessão.
  - Impacto percebido: ao entrar em páginas extras no desktop, o som para (não reinicia). No mobile, comportamento permanece inalterado.

# Checklist de Melhorias — Devazi

- [x] **Audio - Botao e pausa automatica separados**
  A pausa automatica ao sair da tela usava o mesmo fluxo da pausa manual, travando o botao de som e permitindo retomadas automaticas estranhas ao voltar para a aba.
  > Corrigido em `assets/js/audio.js` e `assets/js/script.js`: pausa automatica agora silencia e pausa sem marcar `userPaused`, nao grava flags antigas de retomada automatica e nao volta a tocar sozinha quando o convidado retorna para a aba. Testes adicionados em `tests/unit/audio.test.js`.

- [x] **Minimal - Galeria, FAQ e extras desalinhadas**
  O layout minimal tinha problemas nas paginas extras: a galeria da historia nao trocava visualmente de foto, o FAQ nao exibia respostas, a timeline da historia jogava o texto em uma coluna estreita, as extras somavam padding no topo, os formularios de mensagem/musica nao pareciam campos editaveis e a hospedagem renderizava itens vazios/labels incorretos.
  > Corrigido em `assets/layouts/minimal/layout.css`, `assets/layouts/minimal/defaults.json`, `assets/js/faq.js`, `assets/js/hospedagem.js`, `tests/integration/faq.integration.test.js` e `tests/integration/hospedagem.integration.test.js`: a galeria agora usa `.active`, o FAQ exibe respostas diretamente com pergunta em tipografia coerente, a timeline coloca titulo e texto na coluna de leitura, as extras deixam de duplicar padding no primeiro bloco, os formularios extras ganharam campos claros e hospedagem filtra itens vazios respeitando `linkLabel`.

- [x] **P2 â€” Campo de cupom digitÃ¡vel no Stripe Checkout do upgrade**
  O checkout de upgrade jÃ¡ era aberto pela pÃ¡gina hospedada do Stripe, mas a sessÃ£o nÃ£o habilitava a entrada de cÃ³digo promocional. Sem essa flag, cupons e promotion codes criados no dashboard nÃ£o aparecem para o usuÃ¡rio.
  > Corrigido em `api/payments.js`: adicionada a flag `allow_promotion_codes: true` na criaÃ§Ã£o da `checkout.session`. Implementado em 28/05/2026.
> Itens ordenados por área. Marque `[x]` quando concluído e `[!]` quando encontrar impedimento

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

- [x] **B7 — Modal da lista de presentes quebrava o link de cartão com 404**
  O link salvo no dashboard estava sendo reescrito na página de presentes com um parâmetro `amount`, o que podia invalidar URLs prontas do provedor de pagamento.
  > Corrigido em `presente.html`: a modal agora abre exatamente a URL cadastrada em `gift.cardPaymentLink`, sem alterar query string; o valor sugerido continua aparecendo apenas como texto de apoio.

- [x] **B8 — Link de cartão podia abrir como rota relativa do convite**
  Quando o casal informava o link sem protocolo, o botão de cartão podia concatenar a URL do convite com o valor salvo no dashboard, gerando erro 404.
  > Corrigido em `assets/js/script.js` e `presente.html`: o link agora é normalizado para URL absoluta com `https://` antes da validação e antes de ser aplicado ao botão. Também foram suavizados os textos visíveis da aba de cartão para priorizar "presentear" em vez de "pagamento".

- [x] **B9 — Erro de senha reutilizada aparecia em inglês**
  Ao redefinir a senha usando uma senha já utilizada, a mensagem retornada pelo Supabase era exibida diretamente em inglês.
  > Corrigido em `assets/js/reset-password.js`: mensagens de erro de atualização de senha agora são normalizadas para português, incluindo senha reutilizada, senha fraca, link expirado e excesso de tentativas.

- [x] **B10 — Campo de senha do dashboard sem visualização**
  A tela de login do dashboard não tinha controle para conferir a senha digitada antes de entrar.
  > Corrigido em `dashboard.html` e `assets/js/dashboard.js`: adicionado botão de mostrar/ocultar senha com estado acessível e foco visível.

- [x] **B11 — Aba Convites sem paginação**
  A aba de convites carregava todos os grupos em uma única tabela, diferente das demais abas paginadas do dashboard.
  > Corrigido em `dashboard.html` e `assets/js/dashboard.js`: adicionada paginação da tabela de convites em páginas de 20 itens, preservando a lista completa para filtros e relatórios.

- [x] **B12 — Visão geral usava apenas a página atual de confirmações**
  Os cards da visão geral calculavam confirmados e recusados a partir da página carregada na tabela de confirmações, não do total real salvo no banco.
  > Corrigido em `api/dashboard/confirmations.js` e `assets/js/dashboard.js`: criada leitura global de resumo para totais e atividade recente, independente da paginação.

- [x] **B13 — Imagem do casal na hero da landing com 404**
  A landing referenciava `assets/images/landing-couple.jpeg`, mas o arquivo versionado estava como `assets/images/Landing-couple.jpeg`.
  > Corrigido em `landing.html`: o `src` da imagem do casal agora usa exatamente o nome do arquivo existente.

- [x] **B14 - Musica do convite ignorava inicio em segundos em producao**
  O preview do dashboard aguardava a metadata antes de aplicar o inicio da musica, mas o player do convite podia chamar `play()` antes de o navegador aceitar o `currentTime`, especialmente com audio remoto/Storage/CDN.
  > Corrigido em `assets/js/audio.js`: o primeiro play agora inicia mudo, aplica `startTime` quando a metadata permite, aguarda o seek assentar, respeita a entrada da interface/botao de som e so depois sobe o volume com fade via Web Audio/GainNode. Teste unitario adicionado em `tests/unit/audio.test.js`.

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

- [x] **N10 - Exibir e-mail da conta no dashboard**
  O dashboard mostrava o plano do usuario, mas nao deixava visivel qual e-mail estava autenticado na sessao.
  > Implementado em `dashboard.html` e `dashboard.js`: o e-mail retornado por `/api/dashboard/profile` aparece abaixo do plano na sidebar desktop e no menu mobile aberto pelo hamburguer, com truncamento visual para nao quebrar o alinhamento. Implementado em 11/06/2026.

- [x] **N11 - Foto padrao no perfil do dashboard**
  O dashboard nao exibia imagem de perfil para contas recem-criadas.
  > Implementado em `dashboard.html` e `assets/js/dashboard.js`: a sidebar agora usa `assets/images/Hero-standard.jpeg` como foto padrao enquanto o perfil nao tiver uma URL propria de foto. Quando o backend passar a retornar `photo_url`, `avatar_url` ou `profile_photo_url`, a imagem sera substituida automaticamente.

- [x] **N12 - Foto principal padrao do convite**
  Convites sem foto principal propria ainda podiam apontar para `assets/images/couple/casal.png`, arquivo ausente no projeto.
  > Implementado em `api/auth/signup.js`, `assets/config/defaults/site.json`, `assets/config/site.json`, `api/event-config.js`, `assets/js/script.js` e `assets/js/dashboard.js`: novos convites nascem com `assets/images/Hero-standard.jpeg`; convites antigos com URL vazia ou quebrada caem visualmente nessa foto padrao ate o casal enviar a propria foto principal.

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
  > Implementado no fluxo de convites do dashboard: o casal pode reaplicar o texto padrÃ£o sem reescrever manualmente a mensagem, e o rodapÃ© da mensagem preserva a quantidade de pessoas do convite.

- [x] **S1 â€” Implementar a migration 013 de equalizaÃ§Ã£o opcional dos defaults em `public.events`**
  O plano de equalizaÃ§Ã£o previa uma migration opcional para alinhar o contrato da tabela `public.events` ao snapshot de desenvolvimento, preenchendo `NULL` legados e endurecendo defaults/nulabilidade em campos principais do evento.
  > Implementado em `docs/migrations/013_equalize_events_defaults_optional.sql`: a migration normaliza `couple_names`, `bride_name`, `groom_name`, `venue_name`, `venue_address` e `venue_maps_link` com `COALESCE`, define default `''` e aplica `NOT NULL` nessas colunas. Como muda o contrato da tabela, foi mantida como etapa opcional e dependente de validaÃ§Ã£o prÃ©via de processos externos.
