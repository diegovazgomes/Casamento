# Documentacao Tecnica Completa do Projeto

## 1. Objetivo deste documento

Este arquivo serve como referencia tecnica completa do projeto de convite de casamento de Siannah e Diego. A intencao e que qualquer pessoa, inclusive em outro projeto, consiga entender:

- como a aplicacao esta organizada hoje;
- quais arquivos participam do funcionamento;
- onde ficam conteudo, tema, tipografia e fluxos de navegacao;
- quais funcoes existem e o que cada uma faz;
- quais sao os pontos fortes, os pontos fracos e as proximas melhorias recomendadas.

Este nao e apenas um resumo conceitual. O objetivo aqui e documentar o comportamento real do codigo no estado atual do repositorio.

### 1.1 Fontes de verdade do projeto

Para reduzir duplicidade de manutencao entre documentos:

- `ROADMAP.md`: backlog, prioridades e status de execucao.
- `cursorrules`: padroes de implementacao, qualidade e seguranca de mudancas.
- `CLAUDE.md`: referencia tecnica estavel de arquitetura, modulos, contratos e fluxos.

Mudancas de status devem ficar no `ROADMAP.md`. Este arquivo deve registrar apenas o estado tecnico atual.

---

## 2. Visao geral do projeto

Trata-se de um convite de casamento com duas modalidades de implantacao:

1. **Site estatico** — HTML/CSS/JS servido diretamente, configuracao em `assets/config/site.json`.
2. **Plataforma multi-tenant** — implantado no Vercel com funcoes serverless (`api/`), configuracao por evento armazenada no Supabase, acessada via slug na URL (`/siannah-diego`).

Nao ha build step para runtime. A aplicacao roda diretamente no navegador. `npm` e usado apenas para a camada de testes (Vitest/happy-dom).

### Pilares tecnicos

- HTML estatico por pagina;
- CSS global com variaveis CSS;
- JavaScript modular em ES Modules;
- arquivos JSON para configuracao de conteudo, tema e tipografia;
- funcoes serverless Vercel para persistencia e multi-tenancy;
- Supabase como banco de dados (PostgreSQL).

### Caracteristicas principais

- O conteudo exibido nas paginas vem de `assets/config/site.json` (modo estatico) ou de `/api/event-config?slug=...` (modo multi-tenant).
- O tema visual e carregado em runtime a partir de um arquivo JSON em `assets/layouts/<layout>/themes/`.
- A tipografia global disponivel fica em `assets/config/typography.json`.
- O arquivo central de inicializacao e `assets/js/script.js`.
- Existe um fluxo de loading screen, intro screen, liberacao da experiencia, troca de contexto de audio e navegacao dinamica entre paginas e secoes.
- Convidados podem ser identificados por token via `?g=<token>`, personalizando a saudacao e controlando vagas do grupo.

### O que o sistema faz hoje

- Exibe uma tela de loading antes do bootstrap e uma tela de intro para abertura do convite.
- Mostra hero, contagem regressiva, detalhes do evento, confirmacao de presenca e rodape.
- Persiste confirmacoes de presenca e mensagens de convidados no Supabase via `/api/submissions`.
- Gera links para paginas extras a partir da configuracao.
- Carrega uma pagina de presentes com Pix e estado de copia para a area de transferencia.
- Redireciona o usuario ao WhatsApp com mensagem preformatada apos a confirmacao de presenca.
- Aplica tema visual e tipografico por JSON, sem recompilar nada.
- Controla trilha sonora com dois contextos: principal e presente.
- Oferece painel administrativo (`/dashboard.html`) para o casal gerenciar convidados, ver confirmacoes e editar configuracoes.

---

## 3. Como executar e testar localmente

### Modo estatico (sem API)

```bash
npx serve .
```

ou

```bash
python -m http.server 8080
```

### Modo multi-tenant (com API Vercel)

```bash
npm install -g vercel
vercel dev
```

Requer variaveis de ambiente em `.env.local`:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DASHBOARD_PASSWORD=senha-do-casal
```

### Entradas principais

- Pagina inicial: `index.html`
- Pagina de presentes: `presente.html`
- Paginas extras: `historia.html`, `faq.html`, `hospedagem.html`, `mensagem.html`, `musica.html`
- Ferramenta de edicao de configuracao: `editor.html`
- Ferramenta de comparacao tipografica: `font-preview.html`
- Painel administrativo: `dashboard.html`

### Observacao importante sobre fetch()

Sem servidor local, alguns ambientes podem impor restricoes na carga de JSON via `fetch()`. Sempre use um servidor local para desenvolvimento.

### Testes (Vitest)

```bash
npm install       # instalar dependencias
npm test          # rodar todos os testes
npm run test:watch
npm run test:coverage
```

#### Suite atual (17 arquivos de teste)

**Unit (tests/unit/):**
- `utils.test.js` — `mergeDeep()`, `cloneDeep()`
- `countdown.calculation.test.js` — calculo puro do countdown
- `rsvp.message.test.js` — construcao de mensagem/URL de WhatsApp
- `rsvp.persistence.test.js` — operacoes no Supabase via rsvp-persistence.js
- `event-config.mapper.test.js` — mapeamento de config de evento da API

**Integration (tests/integration/):**
- `script.config.test.js` — `loadConfig()` e `loadTheme()` com fetch mockado
- `countdown.integration.test.js` — atualizacao de DOM do contador
- `presente.clipboard.test.js` — fluxo de copia do Pix
- `rsvp.flow.integration.test.js` — fluxo completo de RSVP
- `loading-screen.test.js` — visibilidade da loading screen
- `event-config.api.test.js` — endpoint `/api/event-config`
- `dashboard.integration.test.js` — funcionalidades do dashboard
- `dashboard-theme-config.test.js` — config de tema no dashboard
- `dashboard-event.api.test.js` — endpoint de evento do dashboard
- `dashboard-media.api.test.js` — endpoint de midia do dashboard
- `guest-submissions.integration.test.js` — fluxo de submissao de convidados
- `submissions.api.test.js` — endpoint `/api/submissions`

---

## 4. Filosofia arquitetural

O projeto segue uma separacao clara entre:

- estrutura HTML;
- estilo visual via CSS variables;
- comportamento JavaScript;
- conteudo e configuracoes via JSON (ou API).

### Decisao central

O HTML contem principalmente containers e IDs para o JavaScript preencher o DOM. O conteudo real, quando configuravel, nao fica hardcoded nas paginas.

### Modo estatico vs. multi-tenant

O modulo `assets/js/config-source.js` resolve automaticamente de qual fonte vem a configuracao:

- Se a URL nao tem slug (ex: `localhost/index.html`): usa `assets/config/site.json`.
- Se a URL tem slug (ex: `meusite.com/siannah-diego`): usa `/api/event-config?slug=siannah-diego`.

Isso torna o mesmo codebase de frontend capaz de rodar como site estatico ou como instancia de uma plataforma multi-tenant, sem alterar nenhum arquivo.

---

## 5. Estrutura de pastas

```text
.
├── CLAUDE.md
├── ROADMAP.md
├── cursorrules
├── index.html
├── presente.html
├── historia.html
├── faq.html
├── hospedagem.html
├── mensagem.html
├── musica.html
├── editor.html
├── font-preview.html
├── dashboard.html
├── package.json
├── package-lock.json
├── vitest.config.js
├── api/
│   ├── config.js
│   ├── submissions.js
│   ├── event-config.js
│   ├── guest-token.js
│   ├── _lib/
│   │   ├── supabase-server.js
│   │   ├── event-config.js
│   │   └── dashboard-auth.js
│   └── dashboard/
│       ├── auth.js
│       ├── confirmations.js
│       ├── event.js
│       ├── guest-groups.js
│       ├── media.js
│       ├── reminders.js
│       └── submissions.js
├── assets/
│   ├── audio/
│   ├── config/
│   │   ├── site.json
│   │   ├── typography.json
│   │   ├── defaults/
│   │   │   ├── site.json
│   │   │   └── theme.json
│   │   ├── themes/             (legado — temas agora em assets/layouts/)
│   │   └── schemas/
│   │       ├── site-schema.json
│   │       └── theme-schema.json
│   ├── css/
│   │   ├── style.css
│   │   ├── animations.css
│   │   └── fonts.css
│   ├── layouts/
│   │   ├── classic/
│   │   │   ├── layout.css
│   │   │   └── themes/
│   │   │       ├── classic-gold.json
│   │   │       ├── classic-gold-light.json
│   │   │       ├── classic-silver.json
│   │   │       ├── classic-silver-light.json
│   │   │       ├── classic-purple.json
│   │   │       └── classic-blue.json
│   │   └── modern/
│   │       ├── layout.css
│   │       └── themes/
│   │           └── black-silver.json
│   ├── images/
│   │   ├── couple/
│   │   ├── gallery/
│   │   ├── icons/
│   │   └── venue/
│   └── js/
│       ├── script.js
│       ├── main.js
│       ├── countdown.js
│       ├── rsvp.js
│       ├── rsvp-persistence.js
│       ├── audio.js
│       ├── presente.js
│       ├── historia.js
│       ├── faq.js
│       ├── hospedagem.js
│       ├── extra-page.js
│       ├── mensagem.js
│       ├── musica.js
│       ├── editor.js
│       ├── font-preview.js
│       ├── gallery.js
│       ├── map.js
│       ├── utils.js
│       ├── config-source.js
│       ├── loading-screen.js
│       ├── debug-badge.js
│       ├── dashboard-theme-config.js
│       └── dashboard.js
├── tests/
│   ├── integration/
│   ├── setup/
│   └── unit/
└── docs/
    ├── theme-guide.md
    ├── supabase-setup.sql
    ├── supabase-phase1-migration.sql
    └── migrations/
```

### Leitura rapida por area

- `index.html` e a experiencia principal.
- `assets/js/script.js` e o entry point e orquestrador do sistema.
- `assets/js/config-source.js` resolve de onde vem a configuracao (estatico ou API).
- `assets/config/site.json` e a principal fonte de conteudo e parametrizacao no modo estatico.
- `assets/layouts/<layout>/themes/*.json` definem visual, espacamentos, cores, animacao e tipografia.
- `api/` contem as funcoes serverless Vercel.
- `dashboard.html` + `assets/js/dashboard.js` formam o painel administrativo.

---

## 6. Modulo `assets/js/config-source.js`

Modulo central para resolucao da fonte de configuracao. E importado por `loading-screen.js` e `dashboard-theme-config.js`.

### Exportacoes

#### `STATIC_SITE_CONFIG_URL`

Constante: `'assets/config/site.json'`

#### `DEFAULT_LAYOUT_KEY`

Constante: `'classic'`

#### `DEFAULT_THEME_PATH`

Constante: `'assets/layouts/classic/themes/classic-silver.json'`

#### `getEventSlugFromPath(pathname?)`

Extrai o slug do evento do pathname da URL. Retorna string vazia se nao houver slug valido, se o primeiro segmento contiver ponto (arquivo), ou se for `api` / `assets`.

#### `resolveSiteConfigSource(pathname?)`

Retorna `{ slug, url, usesApi }`:

- `usesApi: false` + `url: STATIC_SITE_CONFIG_URL` quando nao ha slug.
- `usesApi: true` + `url: /api/event-config?slug=...` quando ha slug.

#### `resolveThemePath(activeTheme, layoutKey?)`

- Se `activeTheme` comeca com `'assets/'`: caminho legado, retorna diretamente.
- Caso contrario: `assets/layouts/{layoutKey}/themes/{activeTheme}.json`.
- Se `activeTheme` for falsy: retorna `DEFAULT_THEME_PATH`.

---

## 7. Fontes de verdade e precedencia de configuracao

### 7.1 Conteudo principal

**Modo estatico:** `assets/config/site.json`.

**Modo multi-tenant:** `/api/event-config?slug=<slug>` retorna um objeto compativel com o mesmo formato do `site.json`, construido a partir da tabela `events` (e `event_gifts`) no Supabase.

### 7.2 Tema ativo

Ordem de precedencia:

1. `site.json.activeTheme` (ou campo equivalente da API)
2. `ACTIVE_THEME_PATH` em `script.js` como fallback

### 7.3 Tipografia global

As familias tipograficas disponiveis ficam em `assets/config/typography.json`. Sao mescladas com as familias declaradas no tema. O tema tem prioridade.

### 7.4 Ordem final de resolucao do tema

1. `assets/config/defaults/theme.json` carregado por `loadDefaults()`
2. merge do arquivo de tema carregado por `loadTheme()`
3. merge da tipografia global via `mergeThemeWithGlobalTypography()`
4. merge de `siteConfig.themeOverrides` / `themeOverridesByTheme` via `applySiteThemeOverrides()`
5. aplicacao de `responsive.mobile` via `resolveTheme()` quando viewport <= 767px
6. escrita das CSS variables via `applyTheme()`

### 7.5 Pipeline de resolucao de layout

1. `config.activeLayout` (ou fallback `ACTIVE_LAYOUT_KEY = 'classic'`)
2. `loadLayout(layoutKey)` injeta `<link rel="stylesheet" href="assets/layouts/{layout}/layout.css">` no `<head>`
3. `resolveThemePath(activeTheme, layoutKey)` decide o caminho do tema (via `config-source.js`)

---

## 8. Fluxo completo da aplicacao em runtime

### 8.1 Loading screen (antes do bootstrap)

`assets/js/loading-screen.js` (`initLoadingScreen()`):

1. Injeta HTML da loading screen no body.
2. Tenta carregar cores persistidas do `sessionStorage` (`ls-theme-colors`); se nao houver, aplica cores neutras.
3. Faz fetch da configuracao (via `resolveSiteConfigSource()`) apenas para extrair `couple.names` e exibir os nomes dos noivos.
4. O bootstrap principal aplica as cores reais do tema via `applyThemeToLoadingScreen(theme)`.
5. `markBootstrapComplete()` e `markContentReady()` controlam a visibilidade da tela.

### 8.2 Bootstrap antecipado no HTML

Em `index.html` existe um script inline no `<head>` que executa antes do bootstrap principal:

- tenta ler `sessionStorage`;
- tenta ler o query param `section`;
- define `window.__INVITATION_BOOTSTRAP__`;
- define `shouldSkipIntro` quando necessario;
- adiciona `skip-intro` ao `documentElement`;
- configura `history.scrollRestoration = 'manual'`.

### 8.3 Bootstrap principal (`bootstrap()` em `script.js`)

1. `loadDefaults()` — carrega `defaults/theme.json` e `defaults/site.json` em paralelo.
2. `resolveSiteConfigSource()` — determina URL da config (estatica ou API).
3. `loadConfig()` — carrega e mescla a configuracao.
4. Identifica layout e tema ativos.
5. `loadLayout(layoutKey)` — injeta CSS do layout no `<head>`.
6. `loadTheme(themePath)` — carrega e mescla o tema.
7. `loadTypographyConfig()` — carrega tipografia global.
8. `mergeThemeWithGlobalTypography()`, `applySiteThemeOverrides()`, `resolveTheme()`.
9. `applyTheme()` — escreve todas as CSS variables no `:root`.
10. `applyThemeToLoadingScreen(theme)` — repassa cores reais para a loading screen.
11. Instancia `InvitationExperience`.
12. Dispara `app:ready`.

### 8.4 Liberacao da experiencia

- Marca a experiencia como iniciada em `sessionStorage`.
- Mostra o shell principal.
- Inicializa modulos centrais.
- Desbloqueia audio.
- Navega para hash ou secao quando aplicavel.

---

## 9. Arquivo central: `assets/js/script.js`

Entry point e orquestrador. Contem a pipeline completa de bootstrap e a classe `InvitationExperience`.

### 9.1 Constantes principais

- `SITE_CONFIG_URL`: `'assets/config/site.json'`
- `TYPOGRAPHY_CONFIG_URL`: caminho do typography.json
- `INVITATION_STARTED_STORAGE_KEY`: chave do sessionStorage
- `NAVIGATION_SECTION_PARAM`: `'section'`
- `ACTIVE_THEME_PATH`: fallback do tema ativo
- `DEFAULT_THEME_URL` / `DEFAULT_SITE_CONTENT_URL`: caminhos dos defaults
- `ACTIVE_LAYOUT_KEY`: `'classic'`

### 9.2 Funcoes utilitarias

#### `isMobileViewport()`
Retorna `true` quando viewport atende `(max-width: 767px)`.

#### `getBootstrapNavigationState()`
Le `window.__INVITATION_BOOTSTRAP__` e devolve `{ shouldSkipIntro, navigationTarget }`.

#### `resolveTheme(theme)`
Aplica `theme.responsive.mobile` sobre o tema base quando mobile.

#### `resolveTypographyRoles(theme)`
Expande `theme.typography.roles` em variaveis CSS individuais (`--typo-<role>-family`, `--typo-<role>-size`, etc.).

#### `applyTheme(theme)`
Converte a estrutura do tema em CSS custom properties e aplica no `document.documentElement`. Preserva aliases legados: `--cream`, `--gold`, `--gold-light`, `--dark`.

#### `applyThemeToLoadingScreen(theme)`
Repassa cores do tema efetivo para a loading screen (cor de fundo, texto e primaria).

#### `loadDefaults()`
Carrega em paralelo `defaults/theme.json` e `defaults/site.json`.

#### `loadConfig()`
Faz fetch da config (URL resolvida por `config-source.js`), mescla com defaults, chama `warnConfigIssues()`.

#### `loadTheme(themePath)`
Carrega o arquivo de tema via fetch, mescla sobre `DEFAULT_THEME`. Chama `warnThemeIssues()`.

#### `loadLayout(layoutKey)`
Injeta `<link rel="stylesheet">` do CSS de layout no `<head>`.

#### `loadTypographyConfig()`
Carrega `typography.json`. Se falhar, devolve estrutura minima.

#### `mergeThemeWithGlobalTypography(theme, typographyConfig)`
Mescla familias tipograficas globais com as do tema. Tema prevalece.

#### `applySiteThemeOverrides(theme, siteConfig, activeThemePath)`
Aplica `themeOverridesByTheme[temaAtivo]` sobre o tema ja carregado.

#### `warnConfigIssues(config)` / `warnThemeIssues(theme)`
Emitem `console.warn` para campos criticos ausentes.

#### `readNavigationStateFromUrl()` / `buildInternalUrl(base, section)`
Utilitarios de navegacao baseada em query params.

### 9.3 Classe `InvitationExperience`

#### `constructor(config, theme, navigationState = {})`
Guarda configuracoes, cria instancias base, coleta referencias do DOM.

#### `init()`
Executa inicializacao principal: setMeta, setHero, setEventDetails, setTexts, setGift, setPages, presentPage.init(), bindIntro, bindAudioToggle. Decide se entra direto ou aguarda clique.

#### `bindIntro()` / `bindAudioToggle()`
Ligam eventos de UI ao fluxo de entrada e controle de audio.

#### `initializeMainSite()`
Inicializa `WeddingApp`, `Countdown`, `RSVP`. Registra `beforeunload`.

#### `getInitialAudioContext()`
Escolhe contexto de audio: `gift` em paginas de presente/extras, `main` na principal.

#### `enterInvitation(options)`
Fluxo principal de entrada. Marca sessao, atualiza estado visual, inicializa site, libera audio, navega.

#### `navigateWithinInvitation({ targetSection, forceTop })`
Centraliza logica de navegacao pos-inicio.

#### `scrollToSection(sectionId)` / `clearNavigationTarget()`
Scroll suave e limpeza de query params.

#### `applyStartedState({ skipIntro })`
Aplica classes no body, revela shell, esconde/anima saida da intro.

#### `wasInvitationStarted()` / `markInvitationStarted()`
Leem e escrevem `sessionStorage`.

#### `syncAudioButton()`
Sincroniza classes, `aria-label`, `aria-pressed` do botao de audio.

#### `setMeta()`, `setHero()`, `setEventDetails()`, `setTexts()`, `setGift()`, `setPages()`
Preenchem o DOM com dados do config.

### 9.4 `bootstrap()`

Orquestra o carregamento e expoe `window.CONFIG`, `window.THEME`. Dispara `app:ready`.

---

## 10. Modulo `assets/js/loading-screen.js`

Gerencia a tela de carregamento visual antes do bootstrap principal.

### Exportacoes

#### `initLoadingScreen()`
Async. Injeta o HTML da loading screen, tenta carregar cores persistidas ou aplica neutras, busca nomes do casal em paralelo ao bootstrap.

#### `applyThemeToLoadingScreen(theme)`
Chamada pelo `bootstrap()` apos o tema ser resolvido. Aplica `colors.background`, `colors.text`, `colors.primary` via CSS variables. Persiste as cores no `sessionStorage` para proximas visitas (evita flash neutro).

#### `markBootstrapComplete()` / `markContentReady()` / `hideLoadingScreen()`
Controlam o ciclo de vida da loading screen: quando o bootstrap termina e quando o conteudo esta visivel.

---

## 11. Modulo `assets/js/debug-badge.js`

Visivel apenas quando a URL contem `?debug` ou `?dev`.

Exibe um badge com:
- timestamp de load da pagina;
- timestamp do fetch da config;
- tema ativo;
- indicador `FRESH` / `CACHED` (via Performance API, baseado em `transferSize === 0` ou `duration < 10ms`).

Nao exporta nada; executa ao importar se o modo debug estiver ativo.

---

## 12. Modulo `assets/js/main.js`

Exporta a classe `WeddingApp`.

### Metodos

#### `init()`
Encadeia os metodos de setup.

#### `setupHeroContentReveal()`
Revela o conteudo do hero com delay configuravel.

#### `setupHeroPhoto()`
Marca a imagem do casal como carregada adicionando a classe `loaded`.

#### `setupScrollHint()`
Conecta o elemento com `data-scroll-target` a `scrollIntoView({ behavior: 'smooth' })`.

#### `setupRevealOnScroll()`
`IntersectionObserver` que adiciona a classe `visible` a elementos ao entrarem na viewport. Seletores: `.section-tag`, `.section-title`, `.section-body`, `.divider`, `.countdown-wrap`, `.details-grid`, `.rsvp-section`.

---

## 13. Modulo `assets/js/countdown.js`

Exporta a classe `Countdown` e a funcao pura `calculateCountdown(targetTimestamp, now?)`.

### Metodos

#### `constructor(targetDate, config = {})`
Converte a data alvo para timestamp e captura elementos do DOM.

#### `hasRequiredElements()`
Verifica se todos os elementos do contador existem.

#### `formatNumber(value)`
Dois digitos quando `config.countdown.format === 'two-digits'`.

#### `update()`
Calcula e atualiza o DOM. Chama `calculateCountdown()` internamente.

#### `displayFinished()`
Zera valores e cria `<p class="countdown-finished">` com mensagem de fim.

#### `start()` / `stop()`
Inicia/para o `setInterval`.

### Dependencias de DOM

`#countdownWrap`, `#cd-days`, `#cd-hours`, `#cd-mins`, `#cd-secs`.

---

## 14. Modulo `assets/js/rsvp.js`

Exporta a classe `RSVP`.

### Comportamento geral

1. Usuario escolhe se vai ou nao.
2. Informa nome e telefone.
3. Sistema valida campos.
4. Escolhe template de mensagem.
5. Monta URL `https://wa.me/...`.
6. Em paralelo (nao-bloqueante), salva no Supabase via `rsvp-persistence.js`.
7. Mostra feedback e redireciona ao WhatsApp apos delay.

### Metodos principais

`init()`, `bindAttendanceButtons()`, `setAttendance(attending)`, `handleSubmit(event)`, `validateName()`, `validatePhone()`, `buildWhatsAppUrl()`, `renderSuccess()`, `renderError()`, `scheduleRedirect(url)`.

### Estrutura de configuracao esperada

- `whatsapp.destinationPhone`
- `whatsapp.recipientName`
- `whatsapp.redirectDelayMs`
- `whatsapp.messages.attending` / `notAttending`
- `whatsapp.feedback.attending` / `notAttending` / `error`
- `rsvp.supabaseEnabled`
- `rsvp.eventId`

---

## 15. Modulo `assets/js/rsvp-persistence.js`

Salva dados no Supabase via duas estrategias em cascata:

1. **Endpoint serverless** `POST /api/submissions` (preferencial).
2. **Cliente Supabase direto** (fallback quando o endpoint retorna 401/403/404/405/500/503).

### Tabelas

- `rsvp_confirmations`: confirmacoes de presenca.
- `guest_submissions`: mensagens e sugestoes de musica.

### Funcoes exportadas

#### `saveRsvpConfirmation(payload, config)`
Salva confirmacao de presenca. Payload inclui: `name`, `phone`, `attendance`, `event_id`, `source`, `token_id`, `marketing_consent`, `group_name`, `group_max_confirmations` (colunas opcionais strips automaticamente se schema for antigo).

#### `saveGuestMessage(payload, config)`
Salva mensagem ao casal. `type: 'message'`.

#### `saveSongSuggestion(payload, config)`
Salva sugestao de musica. `type: 'song'`.

### Observacao

A chamada e nao-bloqueante no fluxo do RSVP: usa `.catch()` sem `await`. Se o Supabase estiver fora, o convidado nao ve erro.

---

## 16. Modulo `assets/js/audio.js`

Exporta a classe `AudioController` (extends `EventTarget`).

### Estrategia geral

- Audio so e liberado apos interacao do usuario.
- Dois contextos: `main` e `gift`.
- Trocas de contexto usam fade out/fade in.

### Metodos principais

`unlock()`, `startFromGesture(trackKey)`, `setContext(trackKey)`, `playTrack(trackKey)`, `pause()`, `resume()`, `toggle()`, `fadeOutCurrent()`, `fadeVolume(audio, targetVolume, duration)`, `safePlay(audio)`.

### Estrutura esperada de `media.tracks`

```json
{
  "main":  { "src": "assets/audio/main-theme.mp3",  "volume": 0.14, "startTime": 8  },
  "gift":  { "src": "assets/audio/gift-theme.mp3",  "volume": 0.12, "startTime": 78 }
}
```

---

## 17. Modulo `assets/js/presente.js`

Exporta a classe `PresentPage`. Controla a copia do codigo Pix.

### Metodos

`constructor()`, `init()`, `handleCopy(button)`, `getFeedbackElement(button)`, `setFeedback(button, feedback, message, isSuccess)`, `copyWithFallback(value)`.

---

## 18. Modulos das paginas extras

### 18.0 `assets/js/extra-page.js`

Funcao `initExtraPage({ pageKey, idPrefix, onReady, onReveal })`.

Padroniza o bootstrap das extras: aguarda `app:ready`, localiza `config.pages.<pageKey>.content`, preenche metadados basicos, dispara callback.

### 18.1 `assets/js/historia.js`

Usa `initExtraPage` com `pageKey: 'historia'`. Renderiza timeline com `renderTimeline(chapters)`. Quando `content.gallery` possui itens, revela `#historiaGallery` e inicializa carrossel via `initGallery()`.

### 18.2 `assets/js/faq.js`

Usa `initExtraPage` com `pageKey: 'faq'`. Renderiza `renderFaq(items)` em `#faqList`.

### 18.3 `assets/js/hospedagem.js`

Usa `initExtraPage` com `pageKey: 'hospedagem'`. Renderiza `renderCards(containerId, items)` para hoteis e restaurantes.

### 18.4 `assets/js/mensagem.js`

Usa `initExtraPage` com `pageKey: 'mensagem'`. Valida campo obrigatorio, constroi URL `wa.me`, abre em nova aba, exibe feedback. Salva no Supabase via `saveGuestMessage()`.

### 18.5 `assets/js/musica.js`

Usa `initExtraPage` com `pageKey: 'musica'`. Fluxo identico ao mensagem.js para sugestoes de musica. Salva via `saveSongSuggestion()`.

---

## 19. Modulo `assets/js/gallery.js`

Exporta `initGallery(containerId, images)`.

Constroi HTML interno da galeria (slides, dots, botoes prev/next). Navegacao por clique e teclado (ArrowLeft/ArrowRight). Sem efeito se `images` for vazio.

### Como habilitar

Em `site.json`, dentro de `pages.historia.content.gallery`:
```json
[{ "src": "assets/images/gallery/foto1.jpg", "alt": "Descricao" }]
```

---

## 20. Modulo `assets/js/map.js`

Exporta `initLeafletMap(event)`. Escuta `app:ready`. Se `event.mapEnabled !== true`, esconde `#venueMapSection`. Inicializa mapa Leaflet com tile OpenStreetMap, marcador em `event.venueCoordinates`, popup com nome/endereco/link Google Maps, circulo de 400m.

### Campos de config relacionados

`event.mapEnabled`, `event.venueCoordinates`, `event.venueAddress`, `event.locationName`, `event.mapsLink`.

---

## 21. Modulo `assets/js/utils.js`

Utilitarios compartilhados por varios modulos.

### DOM
- `setText(id, value)` — preenche `textContent` por ID.
- `setInputPlaceholder(id, value)` — preenche `placeholder` por ID.
- `revealElements(selector)` — adiciona classe `visible` a elementos.

### Dados
- `cloneDeep(value)` — clone profundo recursivo.
- `mergeDeep(base, override)` — merge profundo recursivo.
- `getPath(obj, path)` — acessa propriedade por caminho de string.
- `setPath(obj, path, value)` — define propriedade por caminho.
- `removePath(obj, path)` — remove propriedade por caminho.

### Strings / Validacao
- `debounce(fn, delay)` — debounce simples.
- `escapeHtml(str)` — escapa caracteres HTML.
- `isValidHttpUrl(str)` — valida URL http/https.
- `isIndexKey(key)` — verifica se chave e numero inteiro.

---

## 22. Modulo `assets/js/dashboard-theme-config.js`

Carrega e resolve a configuracao de tema para o dashboard. Usado por `dashboard.js` para aplicar o tema visual do evento no painel administrativo.

### Exportacao principal

`loadDashboardThemeConfig()` — async. Carrega `site.json` (ou API), resolve caminho do tema, carrega e mescla defaults, tipografia e overrides. Retorna o tema efetivo aplicavel ao dashboard.

---

## 23. Modulo `assets/js/dashboard.js`

Logica completa do painel administrativo do casal (`dashboard.html`).

### Funcionalidades

- Autenticacao por senha via `POST /api/dashboard/auth`.
- Gestao de grupos de convidados (criar, editar, remover).
- Visualizacao de confirmacoes de presenca com filtros.
- Leitura de mensagens e sugestoes de musica dos convidados.
- Relatorios e estatisticas por grupo.
- Exportacao de dados.
- Edicao de configuracoes do evento via `PUT /api/dashboard/event`.
- Upload de midia via `/api/dashboard/media`.

### Estado global

```js
const state = {
  authToken, eventId, eventSlug,
  grupos, confirmacoes, allConfirmacoes,
  mensagens, musicas, currentPage, editingGrupoId
}
```

### Autenticacao

Usa token HMAC com TTL de 1 hora. Token armazenado em `sessionStorage` (`dashboard-access-token`). Suporte a autenticacao legada via `localStorage` (`dashboardToken`).

---

## 24. Camada de API (Vercel Serverless Functions)

Todas as funcoes ficam em `api/`. Sao funcoes Vercel (Node.js), exportando `default async function handler(req, res)`.

### 24.1 `api/config.js`

`GET /api/config`

Expoe `SUPABASE_URL` e `SUPABASE_ANON_KEY` para o frontend. Usado por `rsvp-persistence.js` para inicializar o cliente Supabase no navegador.

### 24.2 `api/submissions.js`

`POST /api/submissions`

Body: `{ table: 'rsvp_confirmations' | 'guest_submissions', payload: {...} }`

Valida e sanitiza os dados antes de inserir no Supabase. Lida com compatibilidade de schema (remove colunas opcionais se o schema for antigo). Retorna `{ ok: true }` ou `{ error: ... }`.

### 24.3 `api/event-config.js`

`GET /api/event-config?slug=<slug>`

Busca o evento na tabela `events` pelo slug. Constroi e retorna um objeto de config compativel com o formato do `site.json`. Inclui dados de `event_gifts`. Suporta galeria resolvida de storage.

### 24.4 `api/guest-token.js`

`GET /api/guest-token?token=<token>`

Valida o token (max 64 chars), busca na tabela `guest_tokens`, conta confirmacoes existentes do grupo e retorna `{ groupName, maxConfirmations, usedConfirmations }`. Usa `SUPABASE_SERVICE_ROLE_KEY` server-side.

### 24.5 `api/dashboard/auth.js`

`POST /api/dashboard/auth`

Body: `{ password }`

Valida contra `DASHBOARD_PASSWORD` (env var). Gera token HMAC com TTL 1h. Retorna `{ token, expiresAt }`.

### 24.6 `api/dashboard/confirmations.js`

`GET /api/dashboard/confirmations`

Lista confirmacoes de presenca do evento com paginacao e filtros.

### 24.7 `api/dashboard/event.js`

`GET/PUT /api/dashboard/event`

Leitura e edicao das configuracoes do evento pelo casal.

### 24.8 `api/dashboard/guest-groups.js`

CRUD de grupos de convidados. Gera tokens personalizados por grupo.

### 24.9 `api/dashboard/media.js`

Upload e gestao de midias do evento (imagens, audio).

### 24.10 `api/dashboard/reminders.js`

Gestao de lembretes e campanhas.

### 24.11 `api/dashboard/submissions.js`

Lista mensagens e sugestoes de musica recebidas.

### 24.12 `api/_lib/supabase-server.js`

`createSupabaseServerClient()` — cria cliente Supabase com `SUPABASE_SERVICE_ROLE_KEY` para uso server-side.

### 24.13 `api/_lib/event-config.js`

Utilitarios para construcao do objeto de config a partir dos dados do banco: `buildEventConfigResponse()`, `applyGalleryToHistoriaConfig()`, `resolveEventGalleryFromStorage()`.

### 24.14 `api/_lib/dashboard-auth.js`

Middleware de autenticacao do dashboard. Valida token HMAC nas requisicoes.

---

## 25. Banco de dados (Supabase)

Schema completo em `docs/supabase-setup.sql`. Migracoes em `docs/migrations/`.

### Tabelas principais

| Tabela | Descricao |
|--------|-----------|
| `events` | Configuracao de cada evento (slug, nomes, data, tema, config JSON) |
| `event_gifts` | Opcoes de presente por evento (Pix, cartao, catalogo) |
| `rsvp_confirmations` | Confirmacoes de presenca dos convidados |
| `guest_submissions` | Mensagens e sugestoes de musica dos convidados |
| `guest_tokens` | Tokens de acesso personalizados por grupo de convidados |

### Variaveis de ambiente necessarias

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DASHBOARD_PASSWORD
```

---

## 26. Sistema de tokens de convidado

Convidados podem receber um link personalizado: `meusite.com/siannah-diego?g=<token>`.

### Fluxo

1. Frontend detecta `?g=token` na URL.
2. Chama `GET /api/guest-token?token=...`.
3. Exibe saudacao personalizada com nome do grupo.
4. Controla numero maximo de confirmacoes do grupo.
5. Inclui `token_id`, `group_name` e `group_max_confirmations` no payload do RSVP.

### Tabela `guest_tokens`

Campos relevantes: `id`, `token`, `group_name`, `max_confirmations`.

---

## 27. Sistema de layouts

### Layouts disponiveis

| Layout | Descricao |
|--------|-----------|
| `classic` | Hero centralizado, tipografia caligrafica, ornamentos |
| `modern` | Hero dividido 50/50, texto a esquerda, tipografia sans-serif |

### Configuracao em `site.json`

```json
"activeLayout": "classic"
```

Valores aceitos: `"classic"` | `"modern"`. Padrao: `"classic"`.

### Temas por layout

```
assets/layouts/classic/themes/
  classic-gold.json
  classic-gold-light.json
  classic-silver.json
  classic-silver-light.json
  classic-purple.json
  classic-blue.json

assets/layouts/modern/themes/
  black-silver.json
```

---

## 28. Sistema de temas

### 28.1 Estrutura esperada de um tema

Cada tema pode conter:

- `colors` — paleta completa
- `typography.fonts` — familias base (`primary`, `serif`, `accent`)
- `typography.sizes` — tamanhos para hero, secoes, countdown, etc.
- `typography.roles` — papeis semanticos expandidos em CSS variables por `resolveTypographyRoles()`
- `spacing`, `layout`, `components`, `radius`, `effects`, `animation`
- `countdown` — formato e frequencia de atualizacao
- `responsive.mobile` — sobrescritas para viewport <= 767px

### 28.2 Aliases legados de CSS variables

`applyTheme()` preserva: `--cream`, `--gold`, `--gold-light`, `--dark`.

### 28.3 Documentacao adicional

`docs/theme-guide.md`.

---

## 29. Configuracao detalhada: `assets/config/site.json`

### Campos de topo

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `activeLayout` | string | Layout ativo (`classic` ou `modern`) |
| `activeTheme` | string | Nome ou caminho do tema ativo |
| `themeFiles` | array | Inventario de temas disponiveis |
| `couple` | object | `{ names, subtitle }` |
| `event` | object | Data, hora, local, coordenadas, mapas |
| `texts` | object | 80+ chaves de texto da interface |
| `gift` | object | Pix, QR, cartao, catalogos |
| `media` | object | Imagem hero, trilhas de audio |
| `pages` | object | Configuracao das paginas extras |
| `whatsapp` | object | Fluxo de confirmacao por WhatsApp |
| `dashboard` | object | `{ eventId, reminderTemplates }` |
| `rsvp` | object | `{ eventId, supabaseEnabled, disablePersistence }` |
| `themeOverridesByTheme` | object | Overrides de CSS variables por tema |

### `rsvp`

```json
{
  "eventId": "siannah-diego-2026",
  "supabaseEnabled": true,
  "disablePersistence": false
}
```

### `dashboard`

```json
{
  "eventId": "siannah-diego-2026"
}
```

---

## 30. Tipografia: `assets/config/typography.json`

### Familias cadastradas (13+)

`jost`, `cormorant_garamond`, `great_vibes`, `allura`, `parisienne`, `pinyon_script`, `rouge_script`, `tangerine`, `bj_cree`, `playfair_display`, `imperial_script`, `cookie`, `charm`.

### Aliases semanticos

`display`, `body`, `serif`, `accent` — apontam para familias reais. `font-preview.js` remove duplicatas ao renderizar.

---

## 31. Camada CSS

### `assets/css/style.css`
Folha principal. Consome CSS variables de `applyTheme()`. Nao usa valores hardcoded de cores ou tamanhos.

### `assets/css/animations.css`
Transicoes de entrada, reveals, integrado com classes `visible`, `is-visible`, `is-open`.

### `assets/css/fonts.css`
Importacao centralizada das fontes.

---

## 32. Ferramentas internas

### 32.1 `editor.html` + `assets/js/editor.js`

Editor visual de `site.json` no navegador.

#### Caracteristicas
- Carrega `site.json` automaticamente ou importa arquivo local.
- Normaliza colecoes em arrays.
- Edita conteudo por abas (Casal & Evento, Textos, FAQ, Historia, Hospedagem, Mensagem, Musica, Mapa & Galeria, Presente, Tema).
- Valida contra `assets/config/schemas/site-schema.json` (`loadSchema`, `validateAgainstSchema`, `renderValidationBanner`).
- Bloqueia exportacao em caso de erros de schema.
- Exporta JSON via download local.
- Indica estado sujo (`isDirty`).

### 32.2 `font-preview.html` + `assets/js/font-preview.js`

Comparacao visual de todas as familias em `typography.json`. Remove aliases duplicados.

### 32.3 `dashboard.html` + `assets/js/dashboard.js`

Painel administrativo do casal. Ver secao 23.

---

## 33. Sistema de validacao de schemas

### `assets/config/schemas/site-schema.json`
JSON Schema (draft-07) para `site.json`. Campos obrigatorios, tipos, format uri, ranges numericos.

### `assets/config/schemas/theme-schema.json`
JSON Schema para arquivos de tema. Inclui definicao reutilizavel `typographyRole`.

---

## 34. Estado global, eventos e armazenamento

### Variaveis globais

- `window.CONFIG` — configuracao mesclada apos bootstrap
- `window.THEME` — tema efetivo apos bootstrap
- `window.__INVITATION_BOOTSTRAP__` — estado de navegacao do script inline
- `window.__SITE_CONFIG__` — config injetado pelo dashboard (quando disponivel)

### Eventos customizados

| Evento | Quem dispara | Quem consome |
|--------|-------------|--------------|
| `app:ready` | `bootstrap()` em `script.js` | `extra-page.js`, paginas extras, `map.js` |
| `statechange` | `AudioController` | `InvitationExperience.syncAudioButton()` |
| `dashboard:config-ready` | `dashboard.js` | `dashboard.js` (loop interno) |

### sessionStorage

| Chave | Uso |
|-------|-----|
| `wedding-invitation-started` | Evita re-exibir a intro na sessao |
| `ls-theme-colors` | Persiste cores do tema para a loading screen |

---

## 35. Navegacao e links especiais

### Query param `section`

```text
index.html?section=extras
```

Usado para rolar para uma secao especifica apos o inicio da experiencia.

### Query param `g` (guest token)

```text
/siannah-diego?g=abc123
```

Identifica o grupo do convidado e personaliza a experiencia.

### Query params de debug

```text
?debug   ou   ?dev
```

Ativa o `debug-badge.js`.

### Retorno das paginas extras

```text
index.html?section=extras
```

Nas paginas `mensagem.html` e `musica.html` existem dois caminhos:
- `index.html` — voltar ao inicio
- `index.html?section=extras` — voltar ao bloco de extras

---

## 36. Paginas HTML e papel de cada uma

| Pagina | Descricao | Scripts |
|--------|-----------|---------|
| `index.html` | Experiencia principal | `script.js` |
| `presente.html` | Pagina de presentes com Pix | `script.js`, `presente.js` |
| `historia.html` | Timeline do casal | `script.js`, `historia.js` |
| `faq.html` | Perguntas frequentes | `script.js`, `faq.js` |
| `hospedagem.html` | Hoteis e restaurantes | `script.js`, `hospedagem.js` |
| `mensagem.html` | Recado ao casal | `script.js`, `mensagem.js` |
| `musica.html` | Sugestao de musica | `script.js`, `musica.js` |
| `editor.html` | Editor de site.json | `editor.js` |
| `font-preview.html` | Comparacao tipografica | `font-preview.js` |
| `dashboard.html` | Painel administrativo | `dashboard.js`, `dashboard-theme-config.js` |

---

## 37. Pontos fortes da arquitetura atual

- **Multi-tenant pronto**: o mesmo frontend opera como site estatico ou instancia de plataforma via `config-source.js`.
- **Alto grau de configurabilidade sem framework**: JSON + CSS variables.
- **Tema fortemente parametrizado**: alterar visual sem tocar no CSS estrutural.
- **Fallbacks embutidos**: nao quebra se `site.json` ou tema falharem.
- **Persistencia nao-bloqueante**: erros de Supabase nao interrompem o fluxo do convidado.
- **Dashboard integrado**: casal gerencia o evento sem depender de desenvolvedor.
- **Loading screen com persistencia de cores**: elimina flash neutral entre visitas.

---

## 38. Pontos fracos e fragilidades

- **Dependencia forte de IDs e naming convention de DOM**: `document.getElementById()` com nomes fixos reduz flexibilidade de refatoracao de HTML.
- **Merge profundo sem validacao semantica em runtime**: `mergeDeep()` nao garante tipos corretos.
- **Cobertura de testes parcial**: fluxo de audio, navegacao completa, mapa/galeria em erro e acessibilidade ainda nao cobertos.
- **Erros tratados de forma simples**: `console.warn/error` sem telemetria ou recuperacao visual estruturada.
- **`sessionStorage` pode nao ser confiavel**: tratado com `try/catch`, mas pode causar inconsistencias visuais.
- **Interpolacao simples no RSVP**: `interpolate()` suficiente para o caso atual, nao e sistema robusto de template.
- **Acoplamento entre pagina e tema em alguns componentes**: semantica ainda depende de chaves exatas do tema.

---

## 39. Proximas melhorias recomendadas

- Expandir cobertura de testes: fluxo de audio, navegacao intro-to-section, mapa/galeria com dados invalidos, aria-invalid/focus-visible.
- Ampliar acessibilidade: estados de foco, navegacao completa por teclado.
- Evolucao do painel: relatorios mais ricos, preview do convite ao vivo.
- Telemetria e logging estruturado.
- Testes de smoke para dashboard e guest tokens.

---

## 40. Se este projeto fosse usado como base para outro projeto

### O que vale reaproveitar diretamente

- `config-source.js` e o padrao de multi-tenancy sem build step.
- Sistema de temas por CSS variables.
- Entry point com pipeline de merge (defaults + theme + typography + overrides).
- Pattern de paginas extras orientadas por configuracao.
- Fluxo de audio contextual.
- Camada de API para submissoes (reutilizavel com qualquer schema Supabase).
- Dashboard admin generico.

### O que provavelmente precisaria ser refeito

- Schema do banco (tabelas especificas de casamento → generico).
- Validacao de dados mais robusta.
- Persistencia e autenticacao mais seguras para producao de escala.
- Telemetria.
- Testes automatizados mais amplos.

---

## 41. Arquivos mais importantes para qualquer manutencao futura

1. `assets/js/script.js` — entry point e pipeline de bootstrap
2. `assets/js/config-source.js` — resolucao de fonte de config (estatico vs. API)
3. `assets/config/site.json` — fonte de conteudo (modo estatico)
4. `api/event-config.js` — fonte de conteudo (modo multi-tenant)
5. `assets/layouts/*/themes/*.json` — visual
6. `index.html`
7. `assets/css/style.css`
8. `assets/js/rsvp.js` + `rsvp-persistence.js`
9. `assets/js/audio.js`
10. `assets/js/utils.js`
11. `assets/js/loading-screen.js`
12. `assets/js/dashboard.js`
13. `assets/js/editor.js`
