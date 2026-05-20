# Checklist de Melhorias — Devazi

> Itens ordenados por área. Marque `[x]` quando concluído e `[!]` quando encontrar impedimento.

---

## Bugs críticos

- [x] **B1 — Convite não carrega na primeira abertura após wizard**
  Depois de criar a conta, passar pelo wizard e abrir o convite pela primeira vez, a página não carrega. Atualizar não resolve. Só funciona ao fechar e reabrir o link. Investigar race condition entre criação do slug, cache de sessão e a primeira requisição ao `api/event-config.js`.
  > Corrigido em `assets/js/script.js`: detecta quando a loading screen está na fase "couple" (brand phase hidden) e chama `onOpen()` diretamente, sem depender do botão invisível.

- [x] **B2 — Mapa com layout quebrado na página de Hospedagem**
  O mapa aparece visualmente distorcido, cortado ou fora do container. Verificar se o CSS do container do Leaflet está com altura definida, e se o `map.invalidateSize()` está sendo chamado após o mapa ficar visível no DOM.
  > Corrigido: adicionada altura explícita ao `#map` em `style.css` (400px desktop / 280px mobile) e chamada `map.invalidateSize()` em `map.js` após a seção sair do `hidden`.

- [x] **B3 — Música continua tocando ao navegar entre páginas**
  O áudio do convite persiste em background mesmo após o usuário sair da página principal e abrir uma página extra. O `AudioController` precisa pausar (ou ser destruído) quando a página for descarregada (`window.beforeunload` ou `visibilitychange`).
  > Corrigido em `script.js`: listener `pagehide` pausa o áudio ao sair; flag `audio-nav-paused` em sessionStorage distingue pausa por navegação de pausa pelo usuário.

- [x] **B4 — Modal de presente exibe opção de cartão mesmo quando desabilitado**
  Quando o pagamento por cartão não está habilitado, ao clicar em um item da lista de presentes o modal ainda mostra a opção de pagar com cartão e redireciona para uma URL aleatória. A opção deve aparecer com **cadeado visual** e sem link clicável (sem CTA de upgrade, pois é o que o convidado vê, não o noivo).
  > Corrigido em `presente.html`: variável de módulo `CARD_ENABLED` sincronizada com `cardPaymentEnabled`; quando desabilitado exibe botão com 🔒, sem `href`, `pointer-events: none`, sem CTA de upgrade.

---

## Plano Free — Bloqueios e restrições

- [x] **F1 — Bloquear toggle de Mensagem e Música para usuários free**
  Na seção "Páginas extras" do dashboard, os toggles de Mensagem ao Casal e Sugestão de Música ainda ficam selecionáveis no plano free. O bloqueio via `applyPlanRestrictions()` precisa ser aplicado após o `renderPagesGrid()` terminar de montar os cards, e não antes.
  > Corrigido em `dashboard.js`: `applyPlanRestrictions(state.userProfile)` agora é chamado dentro de `loadEditorTab()`, logo após `renderPagesGrid()`, garantindo que os elementos existam no DOM.

- [x] **F2 — Marca d'água em todas as páginas do convite (free)**
  A marca d'água "Criado com Devazi" aparece apenas na página principal. Deve aparecer também em todas as páginas extras: Nossa História, FAQ, Hospedagem, Mensagem, Música e Presente.
  > Corrigido: elemento `#devaziWatermark` adicionado ao footer de `historia.html`, `faq.html`, `hospedagem.html`, `mensagem.html`, `musica.html` e `presente.html`. O `script.js` já o revela para plano free.

---

## Funcionalidades novas

- [x] **N1 — Botão de voltar abaixo do mapa em Hospedagem**
  Na página "Para quem vem de fora", o botão de retorno ("Voltar") deve ser posicionado abaixo do mapa, e não antes dele. Ajuste de ordem dos elementos no HTML ou no CSS.
  > Corrigido junto com B2: `gift-back-wrap` movido para após `venueMapSection` em `hospedagem.html`.

- [x] **N2 — Limite de hotéis e restaurantes: máximo 3 de cada**
  Tanto no plano free quanto no premium, o usuário não deve conseguir adicionar mais de 3 hotéis e 3 restaurantes. Bloquear o botão "+ Adicionar" ao atingir o limite e exibir mensagem informativa.
  > Implementado em `dashboard.js`: `MAX_HOSPEDAGEM_ITEMS = 3`; `addHotelItem/addRestaurantItem` retornam cedo ao atingir o limite; botões `#edAddHotelBtn` e `#edAddRestaurantBtn` ficam desabilitados com tooltip.

- [x] **N3 — Galeria limitada por tamanho (MB) em vez de quantidade de fotos**
  Substituir o limite atual por quantidade de fotos por um limite de tamanho total:
  - **Free:** máximo 10 MB de fotos na galeria
  - **Premium:** máximo 30 MB de fotos na galeria
  O controle deve acontecer no upload (`api/dashboard/media.js`): somar o tamanho atual dos arquivos já enviados + o novo arquivo antes de aceitar o envio.
  > Implementado em `api/dashboard/media.js`: `GALLERY_SIZE_LIMIT_FREE_MB = 10` e `GALLERY_SIZE_LIMIT_PREMIUM_MB = 30`; calcula `usedBytes` via `metadata.size` das entradas existentes antes de aceitar o upload.

- [x] **N4 — Círculos das paletas de padrinhos perfeitos no mobile**
  Em telas pequenas, os círculos com as cores das paletas dos padrinhos ficam levemente elípticos. Corrigir garantindo `aspect-ratio: 1 / 1` ou `width` e `height` iguais e fixos no CSS responsivo.
  > Corrigido em `assets/layouts/classic/layout.css`: `aspect-ratio: 1 / 1` e `flex-shrink: 0` adicionados a `.traje-swatch-circle` e `.traje-solo-circle` nos breakpoints desktop e mobile.

- [x] **N5 — Validação de senha forte na criação de conta**
  A tela de recuperação de senha já valida força da senha e confirmação. A mesma lógica deve ser aplicada na tela de **criação de conta**:
  - Exibir indicador de força (fraca / média / forte)
  - Campo de confirmação "Repita a senha"
  - Bloquear o envio se as senhas não coincidirem ou se a senha for fraca
  > Implementado em `signup.html`: indicador de 3 barras (fraca/média/forte), campo "Confirmar senha", bloqueio de envio se força < 2 ou senhas divergem.

- [x] **N6 — Pix como método de pagamento no checkout de upgrade**
  Ao fazer upgrade de free para premium, o checkout do Stripe não exibe a opção de Pix. Habilitar Pix como método de pagamento no produto/price do Stripe Dashboard e, se necessário, passar `payment_method_types: ['card', 'pix']` na criação da sessão de checkout em `api/payments.js`.
  > Implementado em `api/payments.js`: `payment_method_types: ['card', 'pix']` adicionado à criação da Checkout Session. **Pré-requisito:** o price/produto no Stripe Dashboard deve estar em BRL.

---

## Decisões pendentes

- [x] **D1 — Definir comportamento do áudio ao retornar para a página principal vindo de uma extra**
  Após pausar o áudio ao sair (B3), decidir se o áudio deve retomar automaticamente ao voltar para a página principal ou se deve aguardar interação do usuário.
  > Decisão: retoma automaticamente ao voltar via bfcache (botão voltar do browser), mas apenas se a pausa foi causada pela navegação — pausa manual do usuário é preservada.
