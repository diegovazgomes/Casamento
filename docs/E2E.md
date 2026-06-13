# Checklist de Testes E2E — Devazi

> **O que é um teste E2E?**
> E2E (End-to-End, ou "ponta a ponta") significa testar o sistema completo como se você fosse um usuário real, seguindo os passos que ele seguiria, verificando se tudo funciona como esperado
>
> **Como usar este checklist:**
> - Marque `[x]` quando o item passar no teste
> - Marque `[!]` quando encontrar um problema e anote o que aconteceu.
> - Repita os testes após qualquer atualização importante no sistema.

---

## 1. Cadastro e Acesso

### 1.1 Criar conta nova
- [ ] Abrir a página de cadastro
- [ ] Preencher nome, e-mail e senha válidos e clicar em "Criar conta"
- [ ] Verificar se aparece mensagem de confirmação ou se redireciona para o dashboard
- [ ] Verificar se um evento foi criado automaticamente para o novo usuário.

### 1.2 Login com conta existente
- [ ] Acessar a página de login
- [ ] Digitar e-mail e senha corretos e clicar em "Entrar"
- [ ] Verificar se o dashboard carrega corretamente
- [ ] Verificar se o nome/dados do casal aparecem no painel

### 1.3 Proteção de acesso
- [ ] Tentar acessar o dashboard sem estar logado (ex: `/dashboard`)
- [ ] Verificar se o sistema redireciona para a tela de login
- [ ] Fazer login com e-mail ou senha incorretos e verificar se aparece mensagem de erro clara

---

## 2. Tela de Carregamento do Dashboard

- [ ] Após o login, verificar se a tela de carregamento (logo Devazi) aparece enquanto os dados carregam
- [ ] Verificar se a tela de carregamento desaparece automaticamente quando o painel estiver pronto
- [ ] Verificar se o painel aparece completo após o carregamento (sem campos em branco sem motivo)

---

## 3. Assistente de Configuração Inicial (Wizard)

> O wizard aparece para usuários novos que ainda não configuraram o evento.

- [ ] Verificar se o wizard abre automaticamente na primeira vez que o usuário acessa o dashboard
- [ ] **Passo 1 — Nomes do casal:** preencher os nomes e avançar
- [ ] **Passo 2 — Data do evento:** selecionar uma data e avançar
- [ ] **Passo 3 — Locais:** preencher cerimônia e festa e avançar
- [ ] **Passo 4 — WhatsApp:** preencher o número e avançar
- [ ] **Passo 5 — Conclusão:** verificar se aparece o botão "Ver convite" com o link correto
- [ ] Clicar em "Ver convite" e verificar se o convite abre em uma nova aba com os dados preenchidos
- [ ] Clicar em "Ir para o painel" e verificar se o dashboard carrega normalmente

---

## 4. Dashboard — Edição do Evento

### 4.1 Informações gerais
- [ ] Editar o nome do casal e salvar — verificar se o convite reflete a mudança
- [ ] Editar a data do evento e salvar — verificar se a data atualiza no convite
- [ ] Editar os locais da cerimônia e da festa e salvar

### 4.2 Tema e layout (somente Premium)
- [ ] Com conta **free**: verificar se a seleção de tema está bloqueada com aviso de "Premium"
- [ ] Com conta **premium**: trocar o tema e verificar se o convite atualiza visualmente

### 4.3 Traje
- [ ] Com conta **free**: preencher o traje (ex: "Esporte Fino") e salvar — verificar se aparece no card do convite
- [ ] Com conta **free**: verificar se o card de traje no convite **não é clicável** (não abre página)
- [ ] Com conta **free**: verificar se as seções de paleta de cores (madrinhas/padrinhos) estão bloqueadas com aviso de "Premium"
- [ ] Com conta **premium**: verificar se o card de traje no convite é clicável e abre a página de traje

### 4.4 Áudio (somente Premium)
- [ ] Com conta **free**: verificar se a seção de áudio está bloqueada com aviso de "Premium"
- [ ] Com conta **premium**: selecionar uma música e salvar — verificar se toca no convite

---

## 5. Dashboard — Páginas Extras

- [ ] Verificar se as páginas **Nossa História**, **FAQ**, **Hospedagem** e **Presente** podem ser habilitadas/desabilitadas normalmente
- [ ] Com conta **free**: verificar se as páginas **Mensagem ao Casal** e **Sugestão de Música** aparecem como bloqueadas com selo "Premium" e botão de upgrade
- [ ] Com conta **free**: verificar se é impossível habilitar Mensagem e Música mesmo clicando no toggle
- [ ] Com conta **premium**: habilitar Mensagem e verificar se o card aparece no convite
- [ ] Com conta **premium**: habilitar Música e verificar se o card aparece no convite

---

## 6. Dashboard — Lista de Presentes

### 6.1 Pix
- [ ] Preencher a chave Pix (CPF, e-mail ou telefone) e salvar
- [ ] Tentar salvar uma URL como chave Pix (ex: `https://...`) — verificar se o sistema bloqueia com mensagem de erro
- [ ] Habilitar o Pix e verificar se a aba "Pix" aparece na página de presentes do convite

### 6.2 Tipo de lista
- [ ] Selecionar o tipo de lista (ex: "Lua de Mel") e salvar
- [ ] Abrir a página de presentes do convite e verificar se a lista correta aparece

### 6.3 Edição de valores dos itens
- [ ] Alterar o valor de um ou mais itens da lista e salvar
- [ ] Abrir a página de presentes do convite e verificar se os **novos valores aparecem corretamente**
- [ ] Recarregar a página de presentes e verificar se os valores persistem (não voltam ao padrão)

### 6.4 Cartão de crédito (somente Premium)
- [ ] Com conta **free**: verificar se o campo de link de cartão está bloqueado com aviso de "Premium"
- [ ] Com conta **premium**: preencher o link de pagamento por cartão e salvar — verificar se a aba "Cartão" aparece no convite

### 6.5 Lista externa (somente Premium)
- [ ] Com conta **free**: verificar se a lista externa está bloqueada com aviso de "Premium"
- [ ] Com conta **premium**: preencher o link da lista externa e habilitar — verificar se a aba aparece no convite

---

## 7. Convite — Visualização Geral

> Para testar o convite, abra o link público: `https://devazi.app/[slug-do-casal]`

- [ ] Verificar se a tela inicial de abertura do convite aparece corretamente
- [ ] Clicar em "Abrir convite" e verificar se a experiência abre com animação
- [ ] Verificar se o nome do casal, a data e o local aparecem corretamente
- [ ] Verificar se a contagem regressiva está contando o tempo certo
- [ ] Verificar se os cards de páginas extras habilitadas aparecem na seção "Explore"
- [ ] Verificar se páginas desabilitadas **não** aparecem como cards

### 7.1 Marca d'água (somente Free)
- [ ] Com conta **free**: verificar se aparece a marca d'água "Criado com Devazi" no convite
- [ ] Com conta **premium**: verificar se a marca d'água **não** aparece

---

## 8. RSVP (Confirmação de Presença)

- [ ] Preencher o formulário de confirmação com nome e telefone, selecionar "Vou!" e clicar em enviar
- [ ] Verificar se aparece mensagem de sucesso na tela
- [ ] Verificar se após alguns segundos redireciona para o WhatsApp com a mensagem pré-preenchida
- [ ] Repetir o teste selecionando "Não poderei ir" e verificar se a mensagem muda corretamente
- [ ] Tentar enviar sem preencher o nome — verificar se aparece mensagem de erro

---

## 9. Páginas Extras do Convite

### 9.1 Nossa História
- [ ] Abrir a página "Nossa História" pelo convite
- [ ] Verificar se os capítulos da timeline aparecem com os textos corretos
- [ ] Se houver fotos na galeria, verificar se o carrossel funciona (botões anterior/próximo)

### 9.2 FAQ
- [ ] Abrir a página "Perguntas Frequentes" pelo convite
- [ ] Verificar se as perguntas e respostas aparecem corretamente

### 9.3 Hospedagem
- [ ] Abrir a página "Hospedagem" pelo convite
- [ ] Verificar se os hotéis e restaurantes aparecem com nome, descrição e link
- [ ] Verificar se o mapa do local da festa aparece (quando habilitado)

### 9.4 Mensagem ao Casal (Premium)
- [ ] Abrir a página "Mensagem ao Casal" pelo convite
- [ ] Preencher nome e mensagem e clicar em enviar
- [ ] Verificar se abre o WhatsApp com a mensagem formatada corretamente
- [ ] Tentar enviar sem preencher a mensagem — verificar se aparece aviso de campo obrigatório

### 9.5 Sugestão de Música (Premium)
- [ ] Abrir a página "Sugestão de Música" pelo convite
- [ ] Preencher nome da música e artista e clicar em enviar
- [ ] Verificar se abre o WhatsApp com os dados da sugestão

---

## 10. Página de Presentes (Convite)

- [ ] Abrir a aba "Lista de presentes" — verificar se os itens aparecem com os valores corretos
- [ ] Clicar em um item — verificar se o modal de contribuição abre com o nome e valor do item
- [ ] No modal, clicar em "Pix" — verificar se a chave Pix e o QR Code aparecem
- [ ] Verificar se o botão "Copiar chave Pix" copia o texto corretamente (deve aparecer confirmação)
- [ ] Verificar se as abas "Pix direto", "Cartão" e "Lista externa" só aparecem quando habilitadas no dashboard

---

## 11. Upgrade de Plano (Free → Premium)

- [ ] Com conta **free**, clicar em qualquer botão "Fazer upgrade" no dashboard
- [ ] Verificar se abre a página de pagamento corretamente
- [ ] Completar o pagamento com os dados de teste do Stripe
- [ ] Verificar se o plano muda para **premium** após o pagamento
- [ ] Verificar se os recursos bloqueados ficam disponíveis (tema, áudio, etc.)
- [ ] Abrir o convite e verificar se a marca d'água some

---

## 12. Fluxo Completo Ponta a Ponta

> Este é o teste mais importante: simula o ciclo completo do produto.

**Plano Free:**
- [ ] Criar uma conta nova
- [ ] Completar o wizard
- [ ] Verificar o convite gerado
- [ ] Confirmar presença (RSVP) pelo convite
- [ ] Tentar usar recursos premium e confirmar que os bloqueios aparecem

**Plano Premium:**
- [ ] Fazer upgrade a partir de uma conta free
- [ ] Configurar tema, áudio, lista de presentes com valores editados e páginas extras
- [ ] Abrir o convite e conferir todos os elementos
- [ ] Fazer RSVP e confirmar redirecionamento ao WhatsApp
- [ ] Verificar que não há marca d'água

---

## 13. Compatibilidade

- [ ] Testar o convite no **celular** (Android ou iPhone) — verificar layout, botões e fontes
- [ ] Testar o convite no **computador** (Chrome ou Edge)
- [ ] Testar o convite no **Safari** (iPhone ou Mac) — áudio e animações podem se comportar diferente
- [ ] Testar o dashboard no celular — verificar se os campos de edição ficam legíveis e utilizáveis.

---

## Anotações de Problemas Encontrados

| Data | Área | Descrição do problema | Status |
|------|------|-----------------------|--------|
|      |      |                       |        |
|      |      |                       |        |
|      |      |                       |        |
