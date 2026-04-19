# Continuação da Implementação

Data de registro: 19 de abril de 2026

Objetivo deste arquivo: registrar o contexto desta sessão, o que foi implementado, o que foi validado e o que ainda precisa ser investigado, para continuidade em outro computador sem depender do histórico do chat.

## 1. Contexto geral do projeto

Projeto de convite de casamento estático, orientado por configuração em JSON, com HTML estático por página, CSS global e módulos JavaScript em ES Modules.

Arquivos centrais:

- `assets/config/site.json`: conteúdo principal.
- `assets/js/script.js`: bootstrap principal.
- `assets/js/rsvp.js`: fluxo de confirmação da home.
- `assets/js/mensagem.js`: formulário de mensagem ao casal.
- `assets/js/musica.js`: formulário de sugestão de música.
- `assets/js/rsvp-persistence.js`: persistência em Supabase.
- `assets/js/extra-page.js`: bootstrap compartilhado das páginas extras.

Arquitetura confirmada pelo documento `CLAUDE.md`.

## 2. Objetivo original desta frente de trabalho

Foi feita uma sequência de mudanças para remover a dependência do WhatsApp como fluxo principal de envio e passar a usar persistência real no Supabase como caminho principal.

O objetivo funcional passou a ser:

- RSVP da home salva direto no banco e mostra feedback local na própria página.
- Página de mensagem salva direto no banco e mostra feedback local.
- Página de música salva direto no banco e mostra feedback local.
- WhatsApp deixa de ser redirecionamento automático e vira, no máximo, CTA secundário opcional.
- Páginas extras continuam renderizando mesmo se o evento `app:ready` já tiver disparado antes do módulo da página carregar.

## 3. Problemas observados durante a sessão

### 3.1 Problema de renderização intermitente nas páginas extras

As páginas `historia.html`, `faq.html`, `hospedagem.html`, `mensagem.html` e `musica.html` às vezes carregavam sem renderizar o conteúdo do `site.json`.

Causa identificada anteriormente:

- o módulo da página extra podia registrar listener de `app:ready` depois que o evento já havia disparado.

Correção aplicada:

- `assets/js/extra-page.js` passou a suportar fallback por `window.CONFIG`, com inicialização idempotente.

### 3.2 Problema de persistência divergente do schema real

Foi identificado que a implementação antiga tentava salvar mensagem e música em uma tabela que não existia no schema usado pelo projeto.

Situação correta do banco, confirmada por `docs/supabase-setup.sql`:

- tabela principal usada pelo frontend: `rsvp_confirmations`
- valores aceitos em `attendance`: `yes`, `no`, `message`, `song`

Problema antigo:

- `saveGuestMessage()` tentava usar `guest_submissions`
- `saveSongSuggestion()` tentava usar `guest_submissions`
- `saveRsvpConfirmation()` ainda mandava colunas inexistentes como `group_name` e `group_max_confirmations`

Correção aplicada:

- tudo passou a gravar em `rsvp_confirmations`
- mensagem grava com `attendance = 'message'`
- música grava com `attendance = 'song'`
- colunas inexistentes foram removidas do payload de RSVP

### 3.3 Ruído de validação por ambiente

Durante a sessão surgiu forte evidência de que o PC corporativo não era uma fonte confiável para validar esse fluxo.

Foi observado que:

- no PC da empresa houve falhas de envio e comportamento inconsistente
- no celular, após revalidação, o fluxo anteriormente reimplementado funcionou

Conclusão prática da sessão:

- parte dos erros vistos provavelmente foi causada por ambiente, rede, política corporativa ou indisponibilidade do endpoint no contexto de teste
- por isso, a validação principal passou a ser: testes automatizados + ambiente compatível com Vercel + teste manual em dispositivo sem restrições

## 4. Rollback e reaplicação

Em determinado momento foi feito rollback para o commit:

- `db3c7e204abb1a4ed3fb7790614b11fecc02907d`

Depois disso, as mudanças foram perdidas temporariamente.

Mais tarde foi confirmado via `git reflog` que os commits corretos ainda existiam localmente e podiam ser reaplicados.

Os commits reaplicados foram:

- `4cd2d69` — restaura o novo fluxo de RSVP/mensagem/música, textos, HTML, CSS e testes de integração
- `0677981` — corrige persistência para gravar mensagem e música em `rsvp_confirmations`
- `8592158` — melhora `extra-page.js` e remove campos inúteis restantes da persistência

Estado final desta reaplicação:

- branch atual: `dev`
- HEAD no momento deste registro: `8592158`

## 5. O que foi implementado efetivamente

### 5.1 RSVP da home

Arquivo principal:

- `assets/js/rsvp.js`

Mudanças restauradas:

- envio passou a depender de persistência-first
- remoção do redirecionamento automático para WhatsApp
- `await` explícito do salvamento
- erro local se a persistência falhar
- sucesso local com possibilidade de hint adicional e CTA secundário de contato

Arquivos de suporte alterados:

- `index.html`
- `assets/js/script.js`
- `assets/config/site.json`
- `assets/config/defaults/site.json`
- `assets/config/schemas/site-schema.json`
- `assets/js/editor.js`
- `assets/layouts/classic/layout.css`
- `assets/layouts/modern/layout.css`

### 5.2 Página de mensagem ao casal

Arquivo principal:

- `assets/js/mensagem.js`

Mudanças restauradas:

- remoção de `window.open()` para WhatsApp como caminho principal
- envio local com persistência-first
- botão desabilitado durante envio
- feedback local de sucesso ou erro

Arquivos de suporte alterados:

- `mensagem.html`
- `assets/config/site.json`
- `assets/config/defaults/site.json`
- `assets/js/editor.js`

### 5.3 Página de sugestão de música

Arquivo principal:

- `assets/js/musica.js`

Mudanças restauradas:

- remoção de `window.open()` para WhatsApp como caminho principal
- envio local com persistência-first
- botão desabilitado durante envio
- feedback local de sucesso ou erro

Arquivos de suporte alterados:

- `musica.html`
- `assets/config/site.json`
- `assets/config/defaults/site.json`
- `assets/js/editor.js`

### 5.4 Inicialização das páginas extras

Arquivo principal:

- `assets/js/extra-page.js`

Mudança restaurada:

- fallback para inicialização com `window.CONFIG` quando `app:ready` já ocorreu antes do módulo registrar o listener

Impacto:

- reduz o risco de páginas extras abrirem em branco

### 5.5 Persistência Supabase

Arquivo principal:

- `assets/js/rsvp-persistence.js`

Mudanças restauradas:

- mensagem e música salvam em `rsvp_confirmations`
- RSVP não envia mais colunas inexistentes
- logs e warnings melhores para configuração pública (`/api/config`)

Contrato esperado do endpoint:

- `api/config.js` retorna `supabaseUrl` e `supabaseAnonKey`

Dependências de deploy:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 6. Arquivos principais impactados

Arquivos restaurados por essa reaplicação:

- `assets/js/rsvp.js`
- `assets/js/mensagem.js`
- `assets/js/musica.js`
- `assets/js/extra-page.js`
- `assets/js/rsvp-persistence.js`
- `assets/js/script.js`
- `index.html`
- `mensagem.html`
- `musica.html`
- `assets/config/site.json`
- `assets/config/defaults/site.json`
- `assets/config/schemas/site-schema.json`
- `assets/js/editor.js`
- `assets/layouts/classic/layout.css`
- `assets/layouts/modern/layout.css`
- `tests/integration/rsvp.flow.integration.test.js`
- `tests/integration/guest-submissions.integration.test.js`
- `tests/unit/rsvp.persistence.test.js`

## 7. Validação automatizada já feita

Após a reaplicação dos commits, foi executado:

```bash
npm test
```

Resultado confirmado nesta sessão:

- `9` arquivos de teste passando
- `31` testes passando
- resultado final: `31/31`

Também foi rodado check de erros estáticos nos arquivos críticos:

- `assets/js/rsvp.js`
- `assets/js/mensagem.js`
- `assets/js/musica.js`
- `assets/js/extra-page.js`
- `assets/js/rsvp-persistence.js`

Resultado:

- sem erros encontrados nesses arquivos

## 8. Estado atual informado pelo usuário

Após a reaplicação, o usuário informou:

- o RSVP funcionou
- as confirmações de mensagem e som deram erro

Isso significa que, no estado atual desta continuação:

- fluxo de RSVP: validado manualmente pelo usuário como funcionando
- fluxo de mensagem: com erro em teste manual
- fluxo de música: com erro em teste manual

## 9. Interpretação técnica do estado atual

Como o RSVP funcionou, algumas peças centrais aparentemente estão corretas:

- endpoint `/api/config` provavelmente respondeu
- credenciais públicas de Supabase provavelmente estavam disponíveis no ambiente testado
- política de insert na tabela `rsvp_confirmations` aparentemente permite pelo menos o caso de RSVP

Isso reduz a chance de o problema atual ser uma falha total de configuração global do Supabase.

As hipóteses mais prováveis para investigar a partir daqui são:

1. divergência entre o payload de mensagem/música e o schema real aceito em produção
2. erro de validação ou de construção de payload específico de `mensagem.js` e `musica.js`
3. diferença entre o comportamento dos mocks de teste e o comportamento real do Supabase em produção
4. algum campo opcional chegando em formato inesperado no ambiente real

Observação importante:

- esta lista é hipótese de investigação, não causa confirmada

## 10. Próxima investigação recomendada

Ao retomar este trabalho em outro computador, seguir nesta ordem:

1. abrir o DevTools do navegador e testar `mensagem.html`
2. capturar o erro exato de console e, se possível, o corpo da resposta HTTP do insert
3. repetir o mesmo em `musica.html`
4. comparar o payload real enviado com o contrato de `rsvp_confirmations` em `docs/supabase-setup.sql`
5. confirmar se os campos enviados em mensagem e música são exatamente estes:
   - mensagem:
     - `name`
     - `phone`
     - `attendance = 'message'`
     - `event_id`
     - `source`
     - `user_agent`
     - `referrer`
     - `message`
   - música:
     - `name`
     - `phone`
     - `attendance = 'song'`
     - `event_id`
     - `source`
     - `user_agent`
     - `referrer`
     - `song_title`
     - `song_artist`
     - `song_notes`
6. se necessário, adicionar log temporário do payload final imediatamente antes do POST em `assets/js/rsvp-persistence.js`
7. se o erro vier do Supabase, checar mensagem textual retornada pela API REST

## 11. Testes existentes que ajudam na continuidade

Testes restaurados importantes:

- `tests/integration/rsvp.flow.integration.test.js`
- `tests/integration/guest-submissions.integration.test.js`
- `tests/unit/rsvp.persistence.test.js`

Uso prático desses testes:

- proteger o comportamento esperado já reaplicado
- evitar regressão ao ajustar mensagem e música
- servir de referência do contrato esperado da persistência

## 12. Comandos úteis para retomar depois

Ver histórico recente:

```bash
git log --oneline -n 10
```

Rodar testes:

```bash
npm test
```

Inspecionar somente os arquivos principais desta frente:

```bash
git diff HEAD~3 HEAD -- assets/js/rsvp.js assets/js/mensagem.js assets/js/musica.js assets/js/extra-page.js assets/js/rsvp-persistence.js
```

Ver schema SQL de referência:

```bash
code docs/supabase-setup.sql
```

## 13. Resumo executivo para retomada rápida

Se precisar lembrar em 1 minuto onde parar:

- o pacote de mudanças foi reaplicado com sucesso por cherry-pick
- os commits reaplicados foram `4cd2d69`, `0677981` e `8592158`
- a suíte automatizada está verde com `31/31`
- o RSVP já foi validado manualmente como funcionando
- o problema aberto agora está restrito aos envios de mensagem e música
- o próximo passo certo é capturar o erro real do navegador/Supabase nesses dois fluxos

## 14. Observação final

Este arquivo foi criado para servir como handoff completo entre máquinas. Se for continuar a investigação em outro ambiente, usar este documento como ponto de entrada antes de abrir o histórico do git ou o chat antigo.