# Checklist de Melhorias — Devazi

> Itens ordenados por área. Marque `[x]` quando concluído e `[!]` quando encontrar impedimento.

---

## Bugs críticos

- [x] **B1 — Convite não carrega na primeira abertura após wizard**
  Depois de criar a conta, passar pelo wizard e abrir o convite pela primeira vez, a página não carrega. Atualizar não resolve. Só funciona ao fechar e reabrir o link. Investigar race condition entre criação do slug, cache de sessão e a primeira requisição ao `api/event-config.js`.

- [ ] **B2 — Mapa com layout quebrado na página de Hospedagem**
  O mapa aparece visualmente distorcido, cortado ou fora do container. Verificar se o CSS do container do Leaflet está com altura definida, e se o `map.invalidateSize()` está sendo chamado após o mapa ficar visível no DOM.

- [ ] **B3 — Música continua tocando ao sair da página (exemplo saindo do navegador)**
  O áudio do convite persiste em background mesmo após o usuário sair do navegador. O `AudioController` precisa parar se o usuário não estiver com a página aberta (ou ser destruído) quando a página for descarregada (`window.beforeunload` ou `visibilitychange`).

- [x] **B4 — Modal de presente exibe opção de cartão mesmo quando desabilitado**
  Quando o pagamento por cartão não está habilitado, ao clicar em um item da lista de presentes o modal ainda mostra a opção de pagar com cartão e redireciona para uma URL aleatória. A opção deve aparecer com **cadeado visual** e sem link clicável (sem CTA de upgrade, pois é o que o convidado vê, não o noivo).

---

## Plano Free — Bloqueios e restrições

- [x] **F1 — Bloquear toggle de Mensagem e Música para usuários free**
  Na seção "Páginas extras" do dashboard, os toggles de Mensagem ao Casal e Sugestão de Música ainda ficam selecionáveis no plano free. O bloqueio via `applyPlanRestrictions()` precisa ser aplicado após o `renderPagesGrid()` terminar de montar os cards, e não antes.

- [x] **F2 — Marca d'água em todas as páginas do convite (free)**
  A marca d'água "Criado com Devazi" aparece apenas na página principal. Deve aparecer também em todas as páginas extras: Nossa História, FAQ, Hospedagem, Mensagem, Música e Presente.

---

## Funcionalidades novas

- [x] **N1 — Botão de voltar abaixo do mapa em Hospedagem**
  Na página "Para quem vem de fora", o botão de retorno ("Voltar") deve ser posicionado abaixo do mapa, e não antes dele. Ajuste de ordem dos elementos no HTML ou no CSS.

- [x] **N2 — Limite de hotéis e restaurantes: máximo 3 de cada**
  Tanto no plano free quanto no premium, o usuário não deve conseguir adicionar mais de 3 hotéis e 3 restaurantes. Bloquear o botão "+ Adicionar" ao atingir o limite e exibir mensagem informativa.

- [ ] **N3 — Galeria limitada por tamanho (MB) em vez de quantidade de fotos**
  Substituir o limite atual por quantidade de fotos por um limite de tamanho total:
  - **Free:** máximo 10 MB de fotos na galeria
  - **Premium:** máximo 30 MB de fotos na galeria
  O controle deve acontecer no upload (`api/dashboard/media.js`): somar o tamanho atual dos arquivos já enviados + o novo arquivo antes de aceitar o envio.

- [ ] **N4 — Círculos das paletas de padrinhos perfeitos no mobile**
  Em telas pequenas, os círculos com as cores das paletas dos padrinhos ficam levemente elípticos. Corrigir garantindo `aspect-ratio: 1 / 1` ou `width` e `height` iguais e fixos no CSS responsivo.

- [x] **N5 — Validação de senha forte na criação de conta**
  A tela de recuperação de senha já valida força da senha e confirmação. A mesma lógica deve ser aplicada na tela de **criação de conta**:
  - Exibir indicador de força (fraca / média / forte)
  - Campo de confirmação "Repita a senha"
  - Bloquear o envio se as senhas não coincidirem ou se a senha for fraca

- [ ] **N6 — Pix como método de pagamento no checkout de upgrade**
  Ao fazer upgrade de free para premium, o checkout do Stripe não exibe a opção de Pix. Habilitar Pix como método de pagamento no produto/price do Stripe Dashboard e, se necessário, passar `payment_method_types: ['card', 'pix']` na criação da sessão de checkout em `api/payments.js`.

---

## Decisões pendentes

- [ ] **D1 — Definir comportamento do áudio ao retornar para a página principal vindo de uma extra**
  Após pausar o áudio ao sair (B3), decidir se o áudio deve retomar automaticamente ao voltar para a página principal ou se deve aguardar interação do usuário.
