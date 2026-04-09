# Documentacao Tecnica Completa do Projeto

## 1. Objetivo deste documento

Este arquivo serve como referencia tecnica completa do projeto de convite de casamento de Siannah e Diego. A intencao e que qualquer pessoa, inclusive em outro projeto, consiga entender:

- como a aplicacao esta organizada hoje;
- quais arquivos participam do funcionamento;
- onde ficam conteudo, tema, tipografia e fluxos de navegacao;
- quais funcoes existem e o que cada uma faz;
- quais sao os pontos fortes, os pontos fracos e as proximas melhorias recomendadas.

Este nao e apenas um resumo conceitual. O objetivo aqui e documentar o comportamento real do codigo no estado atual do repositorio.

---

## 2. Visao geral do projeto

Trata-se de um site estatico de convite de casamento construido sem framework, sem build step e sem gerenciador de dependencias. Toda a aplicacao roda diretamente no navegador usando:

- HTML estatico por pagina;
- CSS global com variaveis CSS;
- JavaScript modular em ES Modules;
- arquivos JSON para configuracao de conteudo, tema e tipografia.

### Caracteristicas principais

- O conteudo exibido nas paginas vem quase todo de `assets/config/site.json`.
- O tema visual e carregado em runtime a partir de um arquivo JSON em `assets/config/themes/`.
- A tipografia global disponivel fica em `assets/config/typography.json`.
- O arquivo central de inicializacao e `assets/js/script.js`.
- O projeto possui uma pagina principal (`index.html`), paginas extras (`historia.html`, `faq.html`, `hospedagem.html`, `presente.html`) e duas ferramentas auxiliares (`editor.html` e `font-preview.html`).
- Existe um fluxo de intro screen, liberacao da experiencia, troca de contexto de audio e navegacao dinamica entre paginas e secoes.

### O que o sistema faz hoje

- Exibe uma tela inicial de abertura do convite.
- Mostra hero, contagem regressiva, detalhes do evento, confirmacao de presenca e rodape.
- Gera links para paginas extras a partir da configuracao.
- Carrega uma pagina de presentes com Pix e estado de copia para a area de transferencia.
- Redireciona o usuario ao WhatsApp com mensagem preformatada apos a confirmacao de presenca.
- Aplica tema visual e tipografico por JSON, sem recompilar nada.
- Controla trilha sonora com dois contextos: principal e presente.

---

## 3. Como executar e testar localmente

Como o projeto e estatico, basta abrir os arquivos HTML diretamente no navegador ou servir a pasta com qualquer servidor estatico.

### Opcoes comuns

```bash
npx serve .
```

ou

```bash
python -m http.server 8080
```

### Entradas principais

- Pagina inicial: `index.html`
- Pagina de presentes: `presente.html`
- Paginas extras: `historia.html`, `faq.html`, `hospedagem.html`
- Ferramenta de edicao de configuracao: `editor.html`
- Ferramenta de comparacao tipografica: `font-preview.html`

### Observacao importante

Embora varios navegadores consigam abrir o site direto por arquivo local, o comportamento com `fetch()` e mais previsivel quando se usa um servidor estatico local. Isso e especialmente importante porque o sistema carrega JSON em runtime.

---

## 4. Filosofia arquitetural

O projeto segue uma arquitetura simples, mas com uma separacao clara entre:

- estrutura HTML;
- estilo visual via CSS variables;
- comportamento JavaScript;
- conteudo e configuracoes via JSON.

### Decisao central do projeto

O HTML contem principalmente os containers e IDs necessarios para o JavaScript preencher o DOM. O conteudo real, quando configuravel, nao deveria ficar hardcoded nas paginas, e sim vir do JSON.

### Consequencia pratica

Isso torna o projeto relativamente facil de portar para outro casal, outro evento, outro tema ou outro fluxo visual sem reescrever a estrutura inteira da aplicacao.

---

## 5. Estrutura de pastas

```text
.
├── CLAUDE.md
├── README.md
├── index.html
├── presente.html
├── historia.html
├── faq.html
├── hospedagem.html
├── editor.html
├── font-preview.html
├── assets/
│   ├── audio/
│   ├── config/
│   │   ├── site.json
│   │   ├── typography.json
│   │   ├── defaults/
│   │   │   ├── site.json
│   │   │   └── theme.json
│   │   ├── themes/
│   │   └── schemas/
│   │       ├── site-schema.json
│   │       └── theme-schema.json
│   ├── css/
│   │   ├── style.css
│   │   ├── animations.css
│   │   └── fonts.css
│   ├── images/
│   │   └── gallery/
│   │       └── index.json
│   └── js/
│       ├── script.js
│       ├── main.js
│       ├── countdown.js
│       ├── rsvp.js
│       ├── audio.js
│       ├── presente.js
│       ├── historia.js
│       ├── faq.js
│       ├── hospedagem.js
│       ├── editor.js
│       ├── font-preview.js
│       ├── gallery.js
│       ├── map.js
│       └── utils.js
└── docs/
		└── theme-guide.md
```

### Leitura rapida por area

- `index.html` e a experiencia principal.
- `assets/js/script.js` e o entry point e o orchestrator do sistema.
- `assets/config/site.json` e a principal fonte de conteudo e parametrizacao.
- `assets/config/themes/*.json` definem visual, espacamentos, cores, animacao e tipografia.
- `assets/css/style.css` e `assets/css/animations.css` consomem as variaveis de tema.
- `editor.html` + `assets/js/editor.js` funcionam como ferramenta interna para editar `site.json` no navegador.

---

## 6. Fontes de verdade e precedencia de configuracao

Esse ponto e um dos mais importantes do projeto.

### 6.1 Conteudo principal

O conteudo principal vem de `assets/config/site.json`.

Esse arquivo hoje concentra:

- nomes do casal;
- subtitulo;
- data e informacoes do evento;
- textos da interface;
- informacoes de presente;
- trilhas de audio;
- configuracao de WhatsApp;
- definicao das paginas extras;
- tema ativo;
- sobrescritas de tema (`themeOverrides`, quando usadas).

### 6.2 Tema ativo

Ha dois niveis para selecao de tema:

1. `const ACTIVE_THEME_PATH` em `assets/js/script.js`
2. `activeTheme` dentro de `assets/config/site.json`

### Regra real de precedencia

O sistema usa esta ordem:

1. `site.json.activeTheme`
2. `ACTIVE_THEME_PATH` em `script.js` como fallback

Ou seja: hoje a fonte preferencial para definir o tema ativo e o proprio `site.json`. A constante em `script.js` funciona como reserva.

### 6.3 Tipografia global

As familias tipograficas disponiveis ficam em `assets/config/typography.json`.

Essas familias sao mescladas com as familias declaradas no tema. O tema tem prioridade sobre o global para preservar o visual configurado.

### 6.4 Ordem final de resolucao do tema

O tema efetivo aplicado ao site e construido assim:

1. `assets/config/defaults/theme.json` carregado por `loadDefaults()`
2. merge do arquivo de tema carregado por `loadTheme()`
3. merge da tipografia global via `mergeThemeWithGlobalTypography()`
4. merge de `siteConfig.themeOverrides` via `applySiteThemeOverrides()`
5. aplicacao de `responsive.mobile` via `resolveTheme()` quando viewport <= 767px
6. escrita das CSS variables via `applyTheme()`

Se os arquivos de defaults falharem no carregamento, `script.js` ainda possui um fallback minimo inline para evitar quebra total do bootstrap.

Essa pipeline e uma das partes mais importantes da arquitetura.

---

## 7. Fluxo completo da aplicacao em runtime

### 7.1 Bootstrap da pagina

Em `assets/js/script.js`, a funcao `bootstrap()`:

1. carrega defaults (`assets/config/defaults/theme.json` e `assets/config/defaults/site.json`) com `loadDefaults()`;
2. carrega `site.json` com `loadConfig()`;
3. identifica o tema ativo;
4. carrega o tema com `loadTheme()`;
5. carrega `typography.json` com `loadTypographyConfig()`;
6. mescla tipografia, overrides e responsividade;
7. aplica todas as CSS variables no `:root`;
8. instancia `InvitationExperience`;
9. dispara o evento global `app:ready` com `{ config, theme }`.

### 7.2 Bootstrapping antecipado no HTML

Em `index.html` existe um script inline no `<head>` que executa antes do carregamento visual principal. Ele:

- tenta ler `sessionStorage`;
- tenta ler o query param `section`;
- define `window.__INVITATION_BOOTSTRAP__`;
- define `shouldSkipIntro` quando necessario;
- adiciona `skip-intro` ao `documentElement` quando precisa pular a intro;
- configura `history.scrollRestoration = 'manual'` quando disponivel.

Isso reduz flicker visual e impede que a intro apareca quando o usuario ja iniciou a experiencia antes.

### 7.3 Liberacao da experiencia

Depois de iniciado, o sistema:

- marca a experiencia como iniciada em `sessionStorage`;
- mostra o shell principal do site;
- inicializa os modulos centrais;
- desbloqueia o audio;
- navega para hash, secao ou overlay, quando aplicavel.

---

## 8. Arquivo central: `assets/js/script.js`

Este e o arquivo mais importante do projeto. Ele faz o papel de entry point, agregador de configuracoes, aplicador de tema e orquestrador dos modulos.

### 8.1 Constantes principais

- `SITE_CONFIG_URL`: caminho do `site.json`
- `TYPOGRAPHY_CONFIG_URL`: caminho do `typography.json`
- `INVITATION_STARTED_STORAGE_KEY`: chave do `sessionStorage`
- `NAVIGATION_SECTION_PARAM`: nome do query param de navegacao (`section`)
- `ACTIVE_THEME_PATH`: fallback do tema ativo
- `DEFAULT_THEME_URL`: caminho do fallback de tema (`assets/config/defaults/theme.json`)
- `DEFAULT_SITE_CONTENT_URL`: caminho do fallback de conteudo (`assets/config/defaults/site.json`)
- `DEFAULT_THEME` / `DEFAULT_SITE_CONTENT`: objetos carregados em runtime a partir dos arquivos acima (com fallback minimo inline)

### Observacao importante

O fallback real do projeto fica em JSON dedicado (`assets/config/defaults/site.json` e `assets/config/defaults/theme.json`). Os objetos em `script.js` sao apenas rede de seguranca minima caso os arquivos externos nao possam ser carregados.

### 8.2 Funcoes utilitarias de topo

#### `isMobileViewport()`

Retorna `true` quando a viewport atende `(max-width: 767px)`. E usada para decidir se o bloco `responsive.mobile` do tema deve ser aplicado.

#### `getBootstrapNavigationState()`

Le o objeto `window.__INVITATION_BOOTSTRAP__` e devolve:

- `shouldSkipIntro`
- `navigationTarget`

Serve como ponte entre o script inline do HTML e a camada modular de JavaScript.

#### `resolveTheme(theme)`

Aplica o bloco `theme.responsive.mobile` sobre o tema base quando a viewport e mobile.

#### `resolveTypographyRoles(theme)`

Expande `theme.typography.roles` em variaveis CSS individuais, como:

- `--typo-<role>-family`
- `--typo-<role>-size`
- `--typo-<role>-weight`
- `--typo-<role>-lineHeight`
- `--typo-<role>-letterSpacing`
- `--typo-<role>-textTransform`
- `--typo-<role>-style`

Isso permite definir papeis tipograficos sem depender apenas de tamanhos individuais hardcoded.

#### `applyTheme(theme)`

Converte a estrutura do tema em CSS custom properties e aplica tudo no `document.documentElement`.

Mapeia grupos como:

- cores;
- familias tipograficas;
- tamanhos de texto;
- espacamentos;
- layout;
- componentes;
- raios de borda;
- efeitos;
- animacoes.

Tambem preserva aliases legados usados no CSS existente, como:

- `--cream`
- `--gold`
- `--gold-light`
- `--dark`

#### `cloneDeep(value)` e `mergeDeep(base, override)`

Sao importadas de `assets/js/utils.js`. Mantem o mesmo comportamento de clone/merge profundo e sao usadas como base da composicao de configuracoes.

#### `loadDefaults()`

Carrega em paralelo `assets/config/defaults/theme.json` e `assets/config/defaults/site.json`, preenchendo `DEFAULT_THEME` e `DEFAULT_SITE_CONTENT` antes do restante do bootstrap.

#### `loadConfig()`

Faz `fetch()` de `site.json`, aplica merge com `DEFAULT_SITE_CONTENT` e retorna o resultado. Se houver falha, usa o fallback carregado de `assets/config/defaults/site.json` (ou o minimo inline, se necessario).

#### `loadTheme(themePath)`

Carrega o arquivo de tema via `fetch()` e faz merge sobre `DEFAULT_THEME` (vindo de `assets/config/defaults/theme.json`). Em erro, retorna apenas o tema base.

#### `loadTypographyConfig()`

Carrega `typography.json`. Se falhar, devolve uma estrutura minima com `families` vazia.

#### `mergeThemeWithGlobalTypography(theme, typographyConfig)`

Mescla as familias tipograficas globais com as familias do tema. O tema prevalece em caso de conflito.

#### `applySiteThemeOverrides(theme, siteConfig)`

Aplica `siteConfig.themeOverrides` sobre o tema ja carregado. E a camada pensada para customizacao local sem precisar duplicar um arquivo de tema inteiro.

### 8.3 Classe `InvitationExperience`

Essa classe orquestra a experiencia de pagina.

#### Responsabilidades gerais

- preencher o DOM com textos e dados configurados;
- controlar intro screen;
- inicializar modulos centrais;
- controlar overlay de presentes;
- integrar o controle de audio;
- montar os cards de paginas extras;
- sincronizar estado visual com navegacao e hash.

#### Metodos e papel de cada um

##### `constructor(config, theme, navigationState = {})`

Guarda configuracoes, cria instancias base e coleta referencias do DOM, incluindo:

- intro screen;
- botao de abrir convite;
- shell principal;
- overlay de presente;
- botao de audio;
- gatilhos de abrir/fechar overlay.

##### `init()`

Executa a inicializacao principal da experiencia:

- `setMeta()`
- `setHero()`
- `setEventDetails()`
- `setTexts()`
- `setGift()`
- `setPages()`
- `presentPage.init()`
- binds de intro, overlay, audio e teclado

Depois decide se deve entrar direto no convite ou aguardar o clique do usuario.

##### `bindIntro()`

Liga o clique do botao de abertura da intro ao fluxo `enterInvitation()` e inicia o contexto de audio a partir do gesto do usuario.

##### `bindGiftOverlay()`

Conecta elementos com `data-open-gift-overlay` e `data-close-gift-overlay` aos metodos de abrir/fechar overlay.

##### `bindAudioToggle()`

Conecta o botao flutuante de audio ao metodo `audio.toggle()`.

##### `bindKeyboardShortcuts()`

Hoje usa a tecla `Escape` para fechar o overlay de presentes quando ele esta aberto.

##### `initializeMainSite()`

Inicializa os modulos centrais apenas uma vez:

- `WeddingApp`
- `Countdown`
- `RSVP`

Tambem registra `beforeunload` para parar o contador.

##### `getInitialAudioContext()`

Escolhe o contexto inicial de audio:

- `gift` em paginas de presente ou paginas extras
- `main` na pagina principal

##### `enterInvitation(options)`

Fluxo principal de entrada na experiencia. Marca a sessao como iniciada, atualiza o estado visual, inicializa o site principal, libera audio e faz navegacao interna.

##### `navigateWithinInvitation({ targetSection, forceTop })`

Centraliza a logica de navegacao apos o inicio:

- abre overlay se `hash === '#gift'`
- rola ate uma secao se houver `targetSection`
- posiciona no topo quando necessario
- respeita hashes existentes no DOM

##### `scrollToSection(sectionId)`

Faz scroll suave para um elemento por ID e limpa o query param `section` depois.

##### `clearNavigationTarget()`

Remove `?section=...` da URL usando `history.replaceState()`.

##### `applyStartedState({ skipIntro })`

Aplica classes no body, revela o shell principal e esconde ou anima a saida da intro.

##### `wasInvitationStarted()`

Le `sessionStorage` para verificar se o convite ja foi iniciado.

##### `markInvitationStarted()`

Escreve no `sessionStorage` a chave `wedding-invitation-started = true`.

##### `openGiftOverlay()`

Abre o overlay de presentes, revela o conteudo animado, muda o contexto de audio para `gift` e foca o botao de fechar.

##### `closeGiftOverlay(scrollTarget)`

Fecha o overlay, restaura o contexto de audio para `main` e opcionalmente faz scroll para um alvo no DOM.

##### `revealGiftOverlayContent()`

Adiciona a classe `visible` aos elementos animaveis do overlay.

##### `syncAudioButton()`

Sincroniza classes, `aria-label`, `aria-pressed` e estado do botao de audio com o estado interno do `AudioController`.

##### `getAudioTracks()`

Extrai do config as trilhas `main` e `gift`.

##### `parseCoupleNames()`

Quebra `couple.names` em dois nomes usando `&`. Se a estrutura nao estiver no formato esperado, usa fallbacks.

##### `setText(id, value)` e `setInputPlaceholder(id, value)`

Esses utilitarios foram centralizados em `assets/js/utils.js` e sao consumidos por import em `script.js`.

##### `setMeta()`

Atualiza:

- `<title>`
- `<meta name="description">`
- `<meta name="theme-color">`

##### `setHero()`

Preenche o hero e a intro com nomes, subtitulo, data e imagem do casal.

##### `setEventDetails()`

Preenche a secao de detalhes da cerimonia e atualiza o link do mapa com `aria-label` acessivel.

##### `setTexts()`

Preenche textos do contador, detalhes, RSVP, botoes, placeholders e links de retorno.

##### `setGift()`

Preenche todos os textos da area de presente, injeta QR code, atualiza o codigo Pix no DOM e sincroniza os atributos `data-copy-value`.

##### `setPages()`

Monta dinamicamente a secao `extras` com base em `config.pages`. So renderiza paginas marcadas como `enabled: true`.

Ordem fixa atual:

1. `historia`
2. `faq`
3. `hospedagem`
4. `presente`

### 8.4 `bootstrap()`

Faz a orquestracao completa do carregamento e, no final, expone no escopo global:

- `window.CONFIG`
- `window.THEME`

Tambem dispara:

```js
window.dispatchEvent(new CustomEvent('app:ready', { detail: { config, theme: effectiveTheme } }));
```

Esse evento e a base do preenchimento das paginas extras.

---

## 9. Modulo `assets/js/main.js`

Exporta a classe `WeddingApp`.

### Papel

Responsavel por pequenos comportamentos visuais da experiencia principal.

### Metodos

#### `init()`

Encadeia os metodos de setup.

#### `setupHeroContentReveal()`

Revela o conteudo do hero com delay configuravel.

#### `setupHeroPhoto()`

Marca a imagem do casal como carregada adicionando a classe `loaded`.

#### `setupScrollHint()`

Conecta o elemento com `data-scroll-target` a um `scrollIntoView({ behavior: 'smooth' })`.

#### `setupRevealOnScroll()`

Cria um `IntersectionObserver` para adicionar a classe `visible` aos blocos principais quando entram em viewport.

### Seletor dos elementos observados

- `.section-tag`
- `.section-title`
- `.section-body`
- `.divider`
- `.countdown-wrap`
- `.details-grid`
- `.rsvp-section`

---

## 10. Modulo `assets/js/countdown.js`

Exporta a classe `Countdown`.

### Papel

Controla o contador regressivo ate a data do evento.

### Metodos

#### `constructor(targetDate, config = {})`

Converte a data alvo para timestamp e captura os elementos do DOM.

#### `hasRequiredElements()`

Verifica se todos os elementos do contador existem antes de iniciar.

#### `formatNumber(value)`

Aplica padrao de dois digitos quando `config.countdown.format === 'two-digits'`.

#### `update()`

Calcula dias, horas, minutos e segundos restantes e atualiza o DOM.

#### `displayFinished()`

Zera os valores e cria um `<p class="countdown-finished">` com a mensagem de fim.

#### `start()`

Executa `update()` imediatamente e inicia o `setInterval()`.

#### `stop()`

Limpa o intervalo.

### Dependencias de DOM

- `#countdownWrap`
- `#cd-days`
- `#cd-hours`
- `#cd-mins`
- `#cd-secs`

---

## 11. Modulo `assets/js/rsvp.js`

Exporta a classe `RSVP`.

### Papel

Gerencia o formulario de confirmacao e prepara o redirecionamento ao WhatsApp.

### Comportamento geral

1. usuario escolhe se vai ou nao;
2. informa nome e telefone;
3. o sistema valida campos obrigatorios;
4. escolhe o template de mensagem correto;
5. monta a URL `https://wa.me/...` com `URLSearchParams`;
6. mostra mensagem de sucesso/feedback;
7. redireciona ao WhatsApp apos delay configurado.

### Metodos

#### `init()`

Valida precondicoes e registra os listeners.

#### `bindAttendanceButtons()`

Liga os botoes `.rsvp-btn-choice` ao metodo `setAttendance()`.

#### `setAttendance(attending)`

Atualiza o hidden input `#rsvp-attendance`, classes `active` e `aria-pressed` dos botoes.

#### `handleSubmit(event)`

Impede o submit padrao, valida campos, constroi a URL do WhatsApp e dispara o feedback.

#### `validateRequiredField(field)`

Normaliza e valida se o campo tem conteudo.

#### `buildWhatsAppUrl()`

Seleciona o template, interpolando os dados do formulario, e retorna a URL final do WhatsApp.

#### `getMessageTemplate()`

Escolhe entre:

- `whatsapp.messages.attending`
- `whatsapp.messages.notAttending`

#### `interpolate(template, values)`

Substitui placeholders no formato `{chave}`.

#### `renderSuccess()`

Mostra a caixa de sucesso, calcula `firstName`, usa mensagens configuradas e desabilita o botao de submit durante o fluxo pendente.

#### `renderError()`

Mostra o feedback de erro configurado.

#### `scheduleRedirect(whatsappUrl)`

Agenda `window.location.assign()` apos `redirectDelayMs`.

### Estrutura de configuracao esperada

- `whatsapp.destinationPhone`
- `whatsapp.recipientName`
- `whatsapp.redirectDelayMs`
- `whatsapp.messages.attending`
- `whatsapp.messages.notAttending`
- `whatsapp.feedback.attending`
- `whatsapp.feedback.notAttending`
- `whatsapp.feedback.error`

### Observacao tecnica

Esse fluxo nao persiste confirmacoes em banco. Ele apenas prepara uma mensagem e encaminha o usuario ao WhatsApp.

---

## 12. Modulo `assets/js/audio.js`

Exporta a classe `AudioController`, que estende `EventTarget`.

### Papel

Controla trilhas de audio em diferentes contextos da experiencia, respeitando restricoes de autoplay dos navegadores.

### Estrategia geral

- o audio so e efetivamente liberado apos interacao do usuario;
- existem dois contextos principais: `main` e `gift`;
- trocas de contexto usam fade out/fade in;
- o botao de audio sincroniza com eventos internos.

### Propriedades relevantes

- `desiredTrackKey`
- `currentTrackKey`
- `readyForPlayback`
- `userPaused`
- `lastError`
- `fadeFrameId`
- `tracks`

### Metodos

#### `createAudioElement(src)`

Cria um elemento `Audio`, define `loop = true`, `preload = 'none'` e registra listener de erro.

#### `emitState()`

Dispara `CustomEvent('statechange')` com o estado interno do controller.

#### `getCurrentElement()`

Retorna o elemento de audio ativo.

#### `getTrackStartTime(trackKey)`

Normaliza o `startTime` configurado para uma faixa.

#### `hasMetadata(audio)`

Verifica se ha metadados suficientes para operar com duracao/seek.

#### `clampTime(audio, time)`

Garante que o `currentTime` aplicado seja valido.

#### `ensureMetadataAndSeek(audio, time)`

Espera metadados, faz seek para o ponto inicial da faixa e tenta se recuperar de erros de timing de metadata.

#### `unlock()`

Marca o controller como pronto para playback.

#### `startFromGesture(trackKey)`

Inicia uma faixa a partir de gesto do usuario. Esse metodo e central para contornar bloqueios de autoplay.

#### `setContext(trackKey)`

Muda o contexto desejado. So toca se o audio ja estiver pronto e nao estiver pausado pelo usuario.

#### `playTrack(trackKey)`

Executa a troca efetiva entre trilhas.

#### `fadeOutCurrent()`

Aplica fade out na trilha atual, pausa e reseta `currentTime`.

#### `fadeVolume(audio, targetVolume, duration)`

Anima volume com `requestAnimationFrame()`.

#### `safePlay(audio)`

Envolve `audio.play()` em `try/catch`.

#### `pause()`

Pausa a faixa atual e marca o controller como pausado pelo usuario.

#### `resume()`

Retoma o playback de acordo com a trilha desejada.

#### `toggle()`

Alterna entre pausa e retomada.

### Estrutura esperada de `media.tracks`

```json
{
	"main": {
		"src": "assets/audio/main-theme.mp3",
		"volume": 0.14,
		"startTime": 8
	},
	"gift": {
		"src": "assets/audio/gift-theme.mp3",
		"volume": 0.12,
		"startTime": 78
	}
}
```

---

## 13. Modulo `assets/js/presente.js`

Exporta a classe `PresentPage`.

### Papel

Controla a funcionalidade de copiar o codigo Pix para a area de transferencia.

### Metodos

#### `constructor()`

Coleta todos os botoes com `data-copy-value`.

#### `init()`

Liga os listeners de clique.

#### `handleCopy(button)`

Executa a tentativa de copia usando `navigator.clipboard.writeText()` e, se necessario, fallback legado.

#### `getFeedbackElement(button)`

Localiza o elemento de feedback via `data-copy-feedback-target`.

#### `setFeedback(button, feedback, message, isSuccess)`

Atualiza texto do botao, classes e mensagem de feedback temporaria.

#### `copyWithFallback(value)`

Usa um `<textarea>` temporario com `document.execCommand('copy')` como fallback.

### Observacao

O modulo nao decide o valor do Pix; ele apenas consome o valor que `script.js` injeta no DOM.

---

## 14. Modulos das paginas extras

As paginas extras seguem um padrao simples:

- carregam `assets/js/script.js`;
- esperam o evento `app:ready`;
- leem `detail.config.pages.<pagina>.content`;
- escrevem o conteudo no DOM.

### 14.1 `assets/js/historia.js`

Nao exporta classe. Trabalha por listener global.

#### Funcoes

- `renderTimeline(chapters)`

`setText()` e `revealElements()` sao importadas de `assets/js/utils.js`.

#### Fluxo

No `window.addEventListener('app:ready', ...)`:

- le `config.pages.historia.content`;
- preenche tag, titulo e intro;
- monta a timeline alternando classes esquerda/direita;
- marca todos os `.reveal` como `visible`.

### 14.2 `assets/js/faq.js`

Tambem trabalha por listener global.

#### Funcoes

- `renderFaq(items)`

`setText()` e `revealElements()` sao importadas de `assets/js/utils.js`.

#### Fluxo

No `app:ready`:

- le `config.pages.faq.content`;
- preenche tag, titulo e intro;
- monta a lista de perguntas e respostas;
- revela os elementos animaveis.

### 14.3 `assets/js/hospedagem.js`

Mesmo padrao das demais extras.

#### Funcoes

- `renderCards(containerId, items)`

`setText()` e `revealElements()` sao importadas de `assets/js/utils.js`.

#### Fluxo

No `app:ready`:

- le `config.pages.hospedagem.content`;
- preenche textos principais;
- renderiza cards de hoteis e restaurantes;
- adiciona links externos quando `item.link` existe.

---

## 15. Ferramentas internas do repositorio

O repositorio possui duas ferramentas uteis para manutencao, mas que nao fazem parte da experiencia publica do convite.

### 15.1 `editor.html` + `assets/js/editor.js`

E um editor visual em navegador para `site.json`.

#### Objetivo

Permitir carregar, editar e exportar um JSON de configuracao sem depender de IDE ou edicao manual bruta.

#### Caracteristicas

- carrega `assets/config/site.json` automaticamente com `loadDefault()`;
- permite importar um arquivo manualmente com `FileReader`;
- normaliza colecoes em formato array;
- edita conteudo por abas;
- exporta o JSON resultante via download local;
- indica estado sujo (`isDirty`).

#### Funcoes de infraestrutura mais importantes

- `setConfigValue(path, value)`
- `markDirty()`
- `markClean()`
- `loadDefault()`
- `handleFileImport(e)`
- `startEditor(parsed)`
- `ensureArrayPath(root, path)`
- `normalizeListCollections(root)`
- `collectInvalidAccommodationLinks()`
- `exportJson()`

`getPath()`, `setPath()`, `removePath()`, `isIndexKey()`, `debounce()`, `escapeHtml()` e `isValidHttpUrl()` foram centralizadas em `assets/js/utils.js` e consumidas por import no `editor.js`.

#### Papel estrategico no projeto

Essa pagina reduz o custo operacional de manter o convite, especialmente para pessoas nao tecnicas.

### 15.2 `font-preview.html` + `assets/js/font-preview.js`

E uma pagina de comparacao tipografica.

#### Objetivo

Exibir todas as familias declaradas em `assets/config/typography.json` para facilitar a escolha visual.

#### Funcoes principais

- `loadFamilies()`
- `deduplicate(families)`
- `createCard({ key, cssValue })`
- `renderGrid(container, items)`
- `init()`

#### Comportamento importante

O script remove aliases semanticos duplicados como `display`, `body`, `serif` e `accent` quando eles apontam para o mesmo `font-family` de outras chaves.

---

## 15.3 Sistema de validacao de schemas

O repositorio possui dois arquivos JSON Schema (draft-07) em `assets/config/schemas/` que documentam e validam a estrutura dos arquivos de configuracao.

### `assets/config/schemas/site-schema.json`

Define o contrato completo do `site.json`. Campos obrigatorios, tipos, format uri para URLs e ranges numericos para volume de audio. Consumido pelo `editor.js` via `loadSchema()`.

### `assets/config/schemas/theme-schema.json`

Define o contrato dos arquivos de tema. Inclui a definicao reutilizavel `typographyRole` para os papeis tipograficos.

### Integracao com `editor.js`

Funcoes adicionadas:

#### `loadSchema()`
Carrega e cacheia `site-schema.json` via fetch. Retorna `null` silenciosamente em caso de falha (nao bloqueia o editor).

#### `validateAgainstSchema(data, schema, path)`
Validador recursivo leve sem dependencias externas. Cobre: `type`, `required`, `properties`, `items`, `format: uri`, `enum`, `minimum`, `maximum`. Retorna array de `{ path, message, severity }`.

#### `renderValidationBanner(results)`
Injeta um banner visual abaixo das abas do editor. Vermelho para erros, amarelo para avisos. Inclui botao de fechar. Exibido ao carregar um JSON e atualizado a cada validacao.

`startEditor()` passou a ser async e chama validacao apos carregar o config. `exportJson()` passou a ser async e bloqueia o download se houver erros de schema.

### Integracao com `script.js`

#### `warnConfigIssues(config)`
Verifica campos criticos do `site.json` mesclado (`couple.names`, `event.date`, `event.mapsLink`, `whatsapp.destinationPhone`) e emite `console.warn` se ausentes. Chamada dentro de `loadConfig()` apos o merge.

#### `warnThemeIssues(theme)`
Verifica campos criticos do tema mesclado (`meta.name`, `colors.background`, `colors.primary`, `typography.fonts.primary`) e emite `console.warn` se ausentes. Chamada dentro de `loadTheme()` apos o merge.

---

## 16. Modulos existentes, mas nao integrados ao fluxo atual

Ambos os modulos foram integrados ao produto.

### 16.1 `assets/js/gallery.js`

ES Module. Exporta `initGallery(containerId, images)`.

#### Parametros

- `containerId`: ID do elemento container no DOM.
- `images`: array de `{ src, alt }` carregado de `assets/images/gallery/index.json`.

#### Comportamento

- Constroi o HTML interno da galeria (slides, dots, botoes prev/next).
- Navegacao por clique nos botoes e dots.
- Navegacao por teclado (ArrowLeft/ArrowRight) scoped ao container.
- Atributos `aria-hidden` e `aria-selected` atualizados a cada troca.
- Sem efeito nenhum se `images` for vazio ou `containerId` nao existir.

#### Como habilitar a galeria

1. Coloque as fotos em `assets/images/gallery/`.
2. Edite `assets/images/gallery/index.json` com a lista:
	 ```json
	 [
		 { "src": "assets/images/gallery/foto1.jpg", "alt": "Descricao da foto 1" },
		 { "src": "assets/images/gallery/foto2.jpg", "alt": "Descricao da foto 2" }
	 ]
	 ```
3. Abra `historia.html` — a galeria aparece automaticamente apos a timeline.

#### Como desabilitar

Esvazie o `index.json` para `[]` ou remova o arquivo. A galeria desaparece sem erros.

#### Integracao

- Importado e chamado por `historia.js` via `loadGallery()`.
- A secao `#historiaGallery` em `historia.html` tem `hidden` por padrao e so e revelada quando `index.json` retorna ao menos 1 imagem.

### 16.2 `assets/js/map.js`

ES Module. Funcao principal: `initLeafletMap(event)`.

#### Comportamento

- Escuta `app:ready` e le `detail.config.event`.
- Se `event.mapEnabled !== true`, esconde a secao `#venueMapSection` e retorna.
- Se Leaflet nao estiver carregado, esconde a secao e emite `console.warn`.
- Inicializa um mapa Leaflet em `#map` com tile OpenStreetMap.
- Posiciona o marcador em `event.venueCoordinates`.
- Popup com nome, endereco e link para o Google Maps (`event.mapsLink`).
- Circulo de 400m ao redor do local.
- Sem dados hardcoded: todos os valores vem do config.

#### Como habilitar o mapa

Em `site.json`, dentro de `event`:
```json
"mapEnabled": true
```

#### Como desabilitar

```json
"mapEnabled": false
```

A secao do mapa some sem erros. O padrao em `assets/config/defaults/site.json` e `false`.

#### Campos de config relacionados

- `event.mapEnabled` — flag mestre (boolean)
- `event.venueCoordinates` — `{ lat, lng }`
- `event.venueAddress` — endereco textual exibido no popup
- `event.locationName` — nome do local exibido no popup
- `event.mapsLink` — URL do Google Maps para o link no popup

#### Integracao

- Carregado em `hospedagem.html` via `<script type="module" src="assets/js/map.js">`.
- Leaflet CSS e JS carregados via CDN (unpkg, versao 1.9.4) apenas em `hospedagem.html`.
- A secao `#venueMapSection` no HTML tem `hidden` por padrao.

---

## 17. Paginas HTML e papel de cada uma

### 17.1 `index.html`

Pagina principal do convite.

#### Estrutura principal

- intro screen
- hero
- countdown
- details
- extras
- RSVP
- gift overlay
- footer
- botao flutuante de audio

#### Particularidades

- contem o script bootstrap inline no `<head>`;
- usa `body.experience-locked` ate a experiencia ser liberada;
- a secao `extras` inicia com `hidden` e so aparece se houver paginas extras habilitadas;
- o overlay de presente existe dentro da pagina, alem da pagina `presente.html` separada.

#### Scripts usados

- `assets/js/script.js`

### 17.2 `presente.html`

Pagina dedicada de presentes.

#### Conteudo principal

- introducao
- bloco Pix
- placeholder de pagamento por cartao
- link de retorno para `index.html?section=extras`

#### Scripts usados

- `assets/js/script.js`
- `assets/js/presente.js`

#### Observacao

Parte da logica de preenchimento dessa pagina vem de `script.js`; a logica especifica de copia vem de `presente.js`.

### 17.3 `historia.html`

Pagina extra que exibe a historia do casal em formato de timeline.

#### Scripts usados

- `assets/js/script.js`
- `assets/js/historia.js`

### 17.4 `faq.html`

Pagina extra de perguntas frequentes.

#### Scripts usados

- `assets/js/script.js`
- `assets/js/faq.js`

### 17.5 `hospedagem.html`

Pagina extra para convidados de fora, com hospedagem e restaurantes.

#### Scripts usados

- `assets/js/script.js`
- `assets/js/hospedagem.js`

### 17.6 `editor.html`

Ferramenta administrativa/operacional para edicao do JSON.

#### Scripts usados

- `assets/js/editor.js`

### 17.7 `font-preview.html`

Ferramenta visual para auditar familias tipograficas cadastradas.

#### Scripts usados

- `assets/js/font-preview.js`

---

## 18. Configuracao detalhada: `assets/config/site.json`

Hoje esse arquivo funciona como a principal fonte de conteudo do projeto.

### 18.1 Campos de topo

#### `activeTheme`

Caminho do tema ativo. Exemplo atual:

```json
"activeTheme": "assets/config/themes/classic-purple.json"
```

#### `themeFiles`

Lista de temas disponiveis. Hoje funciona mais como inventario do que como dependencia direta do runtime.

#### `couple`

Define identidade do casal.

- `names`
- `subtitle`

#### `event`

Define dados do evento.

- `date`
- `displayDate`
- `heroDate`
- `detailDate`
- `weekday`
- `time`
- `timezone`
- `locationName`
- `locationCity`
- `mapsLink`

#### `texts`

Define praticamente todo o texto visivel da interface.

Inclui:

- metadados SEO;
- labels da intro;
- textos do hero;
- contador;
- detalhes do evento;
- labels e placeholders do RSVP;
- textos da area de presente;
- rotulos de navegacao e rodape.

#### `gift`

- `pixKey`
- `pixQrImage`

#### `media`

- `heroImage`
- `tracks.main`
- `tracks.gift`

#### `pages`

Define as paginas extras e sua habilitacao.

Cada pagina usa ao menos:

- `enabled`
- `cardLabel`
- `cardHint`

As paginas com conteudo detalhado usam `content`.

#### `whatsapp`

Configura o fluxo de confirmacao.

- `destinationPhone`
- `recipientName`
- `redirectDelayMs`
- `messages`
- `feedback`

### 18.2 Paginas configuraveis em `site.json`

#### `pages.historia`

Possui `content` com:

- `tag`
- `title`
- `intro`
- `chapters[]`

Cada capitulo usa:

- `year`
- `title`
- `text`

#### `pages.faq`

Possui `content` com:

- `tag`
- `title`
- `intro`
- `items[]`

Cada item usa:

- `question`
- `answer`

#### `pages.hospedagem`

Possui `content` com:

- `tag`
- `title`
- `intro`
- `hotelsTitle`
- `hotels[]`
- `restaurantsTitle`
- `restaurants[]`

Cada item usa:

- `name`
- `description`
- `link`
- `linkLabel`

#### `pages.presente`

Hoje funciona basicamente como entrada para a pagina de presentes dentro da secao de extras.

---

## 19. Configuracao detalhada: `assets/config/typography.json`

Esse arquivo registra as familias tipograficas disponiveis para o ecossistema do projeto.

### Estrutura

```json
{
	"typography": {
		"families": {
			"jost": "'Jost', sans-serif",
			"cormorant_garamond": "'Cormorant Garamond', serif",
			"great_vibes": "'Great Vibes', cursive"
		}
	}
}
```

### Papel arquitetural

- alimentar o merge tipografico em `script.js`;
- servir como base para o `font-preview.html`;
- centralizar nomes de familias para evitar espalhamento manual pelo projeto.

### Aliases semanticos atuais

- `display`
- `body`
- `serif`
- `accent`

Esses aliases ajudam o tema a apontar para familias sem depender diretamente do nome real da fonte.

---

## 20. Sistema de temas: `assets/config/themes/*.json`

O projeto possui hoje os seguintes temas:

- `classic-gold.json`
- `classic-gold-light.json`
- `classic-silver.json`
- `classic-silver-light.json`
- `classic-purple.json`

### 20.1 Estrutura esperada de um tema

Cada tema pode conter:

- `colors`
- `typography.fonts`
- `typography.sizes`
- `typography.roles`
- `spacing`
- `layout`
- `components`
- `radius`
- `effects`
- `animation`
- `countdown`
- `responsive.mobile`

### 20.2 O que cada secao controla

#### `colors`

Paleta completa da experiencia. Inclui:

- fundo;
- superficies;
- cor primaria;
- tons de texto;
- bordas;
- overlays;
- painel de audio;
- estados de foco.

#### `typography.fonts`

Define as familias base usadas pelo CSS:

- `primary`
- `serif`
- `accent`

#### `typography.sizes`

Define tamanhos para hero, secoes, countdown, detalhes, RSVP e rodape.

#### `typography.roles`

Camada semantica para tipografia baseada em papeis, resolvida em CSS variables por `resolveTypographyRoles()`.

#### `spacing`

Controla margens, paddings e gaps macro e micro.

#### `layout`

Controla dimensoes principais como altura do hero e largura maxima de conteudo.

#### `components`

Controla tamanhos especificos de elementos como:

- divisor;
- seta de scroll;
- cards do countdown;
- campos do RSVP.

#### `radius`

Controla arredondamento de cards e botoes.

#### `effects`

Controla sombras, gradientes e transicoes.

#### `animation`

Controla tempos de fade e escalonamento.

#### `countdown`

Controla formato e frequencia de atualizacao do contador.

#### `responsive.mobile`

Permite sobrescrever trechos do tema especificamente para mobile.

### Observacao importante

O projeto possui uma documentacao adicional focada no sistema de temas em `docs/theme-guide.md`.

---

## 21. Camada CSS

### 21.1 `assets/css/style.css`

E a folha principal de estilo do produto. Ela consome as variaveis CSS produzidas por `applyTheme()`.

#### Papel

- definir layout global;
- estilizar hero, detalhes, RSVP, overlay e paginas extras;
- aplicar tipografia, cores e espacamentos via `var(--...)`.

#### Regra arquitetural importante

O CSS foi pensado para depender de variaveis e nao de valores hardcoded sempre que possivel. Isso e o que viabiliza a troca de tema sem recompilar o projeto.

### 21.2 `assets/css/animations.css`

Contem os estilos de animacao e reveal visual.

#### Papel

- controlar transicoes de entrada;
- efeitos de reveal;
- integracao com classes como `visible`, `is-visible`, `is-open`.

### 21.3 `assets/css/fonts.css`

Centraliza a carga/importacao de fontes usadas pelo projeto e pelas ferramentas auxiliares.

---

## 22. Estado global, eventos e armazenamento local

### 22.1 Variaveis globais expostas

Depois do bootstrap, o sistema deixa disponivel:

- `window.CONFIG`
- `window.THEME`

Isso facilita debug manual e o consumo pelas paginas extras.

### 22.2 Evento global customizado

#### `app:ready`

Disparado ao final do bootstrap. E consumido por:

- `historia.js`
- `faq.js`
- `hospedagem.js`

#### Estrutura do payload

```js
{ detail: { config, theme } }
```

### 22.3 Evento do audio

#### `statechange`

Disparado pelo `AudioController` para sincronizar o botao de audio.

### 22.4 `sessionStorage`

#### Chave usada

`wedding-invitation-started`

#### Papel

Evitar que a intro reapareca repetidamente durante a sessao e permitir abrir paginas relacionadas ja com a experiencia considerada iniciada.

---

## 23. Navegacao e links especiais

### 23.1 Query param `section`

Exemplo:

```text
index.html?section=extras
```

Usado para abrir a pagina principal e rolar para uma secao especifica depois da experiencia estar iniciada.

### 23.2 Hash `#gift`

Usado para abrir automaticamente o overlay de presente dentro da pagina principal.

### 23.3 Fluxo de retorno das paginas extras

As paginas extras usam links do tipo:

```text
index.html?section=extras
```

Assim, o usuario volta para a area de cards extras em vez de voltar ao topo do convite.

---

## 24. Mapeamento funcional por pagina

### Pagina principal (`index.html`)

- intro screen com controle de sessao;
- hero preenchido por config;
- countdown vivo;
- cards de detalhes;
- secao dinamica de extras;
- formulario RSVP com redirecionamento;
- overlay interno de presentes;
- audio flutuante.

### Pagina de presentes (`presente.html`)

- visual dedicado para presente;
- copia de Pix;
- retorno para extras;
- reaproveitamento do mesmo config global.

### Pagina de historia (`historia.html`)

- timeline textual por JSON.

### Pagina de FAQ (`faq.html`)

- perguntas e respostas por JSON.

### Pagina de hospedagem (`hospedagem.html`)

- cards externos de hotel e restaurante.

### Editor (`editor.html`)

- manutencao operacional do JSON.

### Preview tipografico (`font-preview.html`)

- inspecao visual das fontes cadastradas.

---

## 25. Pontos fortes da arquitetura atual

### 25.1 Alto grau de configurabilidade sem framework

Mesmo sendo um projeto simples, a separacao entre HTML, JSON e tema permite um nivel bom de reaproveitamento.

### 25.2 Tema fortemente parametrizado

O uso de JSON + CSS variables permite alterar bastante o visual sem tocar no CSS estrutural.

### 25.3 Fallbacks embutidos

O projeto nao quebra completamente se `site.json` ou o tema falharem ao carregar, porque ha defaults locais em `script.js`.

### 25.4 Estrutura modular suficiente para o porte do projeto

Os modulos estao separados por responsabilidade sem sobreengenharia.

### 25.5 Ferramentas auxiliares inteligentes

O editor de JSON e o preview de fontes elevam a operabilidade do projeto.

---

## 26. Pontos fracos e fragilidades do sistema atual

Essa secao e importante para qualquer evolucao futura.

### 26.1 ~~Ausencia de schema formal para `site.json`~~ RESOLVIDO

`assets/config/schemas/site-schema.json` define todos os campos, tipos e requisitos. O editor valida ao carregar e bloqueia o export em caso de erros. `script.js` emite `console.warn` para campos criticos ausentes via `warnConfigIssues()`.

### 26.2 Merge profundo sem validacao semantica

`mergeDeep()` resolve a composicao, mas nao garante que os campos tenham tipo correto, nome correto ou sentido correto. O schema de `site.json` mitiga isso no editor, mas nao ha validacao em runtime no bootstrap.

### 26.3 Dependencia forte de IDs e naming convention de DOM

Boa parte do sistema depende de `document.getElementById()` com nomes fixos. Isso reduz a flexibilidade para refatorar HTML sem atualizar simultaneamente o JS.

### 26.4 Fluxo de RSVP sem persistencia real

O sistema nao confirma presenca em backend. Ele apenas encaminha uma mensagem ao WhatsApp. Se for necessario controle real de convidados, essa arquitetura nao basta.

### 26.5 Falta de testes automatizados

Nao ha testes para:

- carga de config;
- merge de tema;
- RSVP;
- countdown;
- navegacao;
- editor de JSON.

### 26.6 Erros sao tratados de forma simples

Ha `console.warn()` e `console.error()`, mas nao existe camada clara de recuperacao visual, logging estruturado ou telemetria.

### 26.7 Modulos legados coexistem sem integracao clara

~~`gallery.js` e `map.js` existem no repositorio, mas nao fazem parte do fluxo atual.~~ Ambos foram integrados: `gallery.js` em `historia.html` via `index.json` opt-in; `map.js` em `hospedagem.html` via flag `mapEnabled` em `site.json`.

### 26.8 `sessionStorage` pode nao ser confiavel em todos os contextos

O codigo trata falha com `try/catch`, o que evita crash, mas o comportamento visual pode ficar inconsistente em ambientes restritos.

### 26.9 Dependencia de `fetch()` em ambiente estatico

Sem servidor local, alguns ambientes podem impor restricoes ou comportamento inconsistente na carga de JSON.

### 26.10 Interpolacao simples de template no RSVP

A funcao `interpolate()` e intencionalmente simples. Ela e suficiente para o caso atual, mas nao e um sistema robusto de template.

### 26.11 Acoplamento entre pagina e tema ainda e alto em alguns pontos

Apesar do bom uso de variaveis, a semantica de alguns componentes ainda depende muito do CSS existente e das chaves exatas do tema.

---

## 27. Melhorias futuras recomendadas

### ~~27.1 Criar um schema formal para `site.json`~~ FEITO

Implementado em `assets/config/schemas/site-schema.json`. Validador recursivo integrado ao `editor.js` (`loadSchema`, `validateAgainstSchema`, `renderValidationBanner`). Banner visual no editor, bloqueio de export em erros, `console.warn` em runtime via `warnConfigIssues()` em `script.js`.

### ~~27.2 Criar schema para os temas~~ FEITO

Implementado em `assets/config/schemas/theme-schema.json`. Define todos os campos obrigatorios, tipos e a estrutura de `typographyRole` como definicao reutilizavel. `script.js` emite `console.warn` para campos criticos via `warnThemeIssues()`.

### ~~27.3 Externalizar os fallbacks padrao~~ FEITO

Implementado com `assets/config/defaults/theme.json` e `assets/config/defaults/site.json`. O `script.js` agora carrega esses defaults via `loadDefaults()` no bootstrap.

### ~~27.4 Criar camada de utilitarios compartilhados~~ FEITO

Implementado em `assets/js/utils.js`. Hoje concentra helpers compartilhados de DOM, URL, escaping, debounce, clone/merge profundo e manipulacao de paths. Modulos como `script.js`, `editor.js`, `historia.js`, `faq.js` e `hospedagem.js` passaram a importar essas funcoes.

### 27.5 Isolar melhor os modulos de pagina

As paginas extras funcionam bem, mas ainda dependem do evento global `app:ready`. E possivel evoluir isso para uma camada de renderizacao mais explicita por pagina.

### 27.6 Implementar persistencia real de RSVP

Se o projeto evoluir de convite visual para sistema real de convidados, sera necessario:

- backend;
- armazenamento;
- identificacao de convite;
- confirmacao por convidado;
- painel administrativo.

### 27.7 Melhorar acessibilidade

Ha boas bases de `aria-*`, mas seria positivo ampliar:

- estados de foco;
- navegacao completa por teclado;
- feedbacks de erro mais claros;
- validacao mais semantica do formulario.

### 27.8 Revisar pagina de presentes duplicada vs overlay

Hoje ha dois caminhos para presentes:

- overlay dentro de `index.html`
- pagina `presente.html`

Essa duplicidade pode ser mantida por estrategia de UX, mas deveria estar explicitamente decidida. Caso contrario, vira custo de manutencao desnecessario.

### 27.9 Definir o destino dos modulos legados

~~Ou integrar `gallery.js` e `map.js` ao produto, ou removelos/arquivalos.~~ FEITO.

`gallery.js` convertido para ES Module; exporta `initGallery(containerId, images)`. Integrado em `historia.html` com carregamento opt-in via `assets/images/gallery/index.json`. `map.js` convertido para ES Module; integrado em `hospedagem.html` com flag `event.mapEnabled` em `site.json`. Leaflet CDN carregado apenas em `hospedagem.html`. Ambos respondem ao evento `app:ready`.

### 27.10 Adicionar testes minimos de smoke

Mesmo sem framework, ja valeria criar testes simples para:

- carregamento de config;
- merge de tema;
- render de extras;
- URL do WhatsApp;
- copy de Pix.

---

## 28. Se este projeto fosse usado como base para outro projeto

Essa e uma das motivacoes principais deste documento.

### 28.1 O que vale reaproveitar diretamente

- arquitetura baseada em JSON de conteudo;
- sistema de temas por CSS variables;
- entry point com merge de defaults + theme + overrides;
- pattern de paginas extras orientadas por configuracao;
- fluxo de audio contextual;
- editor visual de configuracao.

### 28.2 O que provavelmente precisaria ser refeito ou endurecido

- validacao de dados;
- contrato formal de configuracao;
- persistencia de RSVP;
- telemetria/logging;
- testes automatizados;
- limpeza de codigo legado nao utilizado.

### 28.3 Caminho recomendado de reutilizacao

1. duplicar a estrutura de paginas e `assets/js/script.js` como base;
2. redefinir o schema desejado de `site.json` antes de escalar o projeto;
3. manter o sistema de temas, mas documentar o contrato com schema;
4. decidir cedo se presentes serao overlay, pagina dedicada ou ambos;
5. decidir cedo se RSVP sera apenas WhatsApp ou fluxo com backend.

---

## 29. Resumo executivo do estado atual

O projeto esta em um ponto bom para um site estatico rico e configuravel. A principal virtude e a combinacao de:

- conteudo orientado por JSON;
- tema orientado por JSON;
- CSS parametrico;
- JavaScript modular simples.

Ao mesmo tempo, o projeto ainda opera com contratos implicitos, poucos mecanismos de validacao e certa dependencia de convencoes de DOM e nomenclatura. Isso nao impede o uso atual, mas limita seguranca de manutencao e escalabilidade.

Se a meta for continuar como convite estatico premium, a base atual e suficiente e bem aproveitavel. Se a meta for evoluir para um produto mais robusto, o proximo passo natural e formalizar schemas, reduzir duplicacoes e introduzir validacao real.

---

## 30. Arquivos mais importantes para qualquer manutencao futura

Se alguem precisar entender o projeto rapidamente, a ordem recomendada de leitura e:

1. `assets/js/script.js`
2. `assets/config/site.json`
3. `assets/config/themes/*.json`
4. `index.html`
5. `assets/css/style.css`
6. `assets/js/rsvp.js`
7. `assets/js/audio.js`
8. `assets/js/utils.js`
9. `assets/js/editor.js`

Essa sequencia da uma visao quase completa da arquitetura e do comportamento atual.
