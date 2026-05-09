# ROADMAP — Plataforma SaaS de Convites Digitais
# Documento estratégico e de execução
# Revisado: Maio 2026

---

## VISÃO DO PRODUTO

Transformar a base já existente do convite de Siannah & Diego em uma
plataforma SaaS onde qualquer casal possa criar, personalizar, publicar
e acompanhar seu convite digital premium sem depender de desenvolvedor.

O foco do MVP real não é construir o produto do zero.
O foco é converter a estrutura atual, que já funciona bem para um evento,
em uma operação multi-casal com aquisição, autenticação, cobrança e
onboarding.

---

## LEITURA REAL DO ESTADO ATUAL

### O que já está pronto e não precisa ser refeito

- Convite público maduro, com tema, layout, páginas extras, áudio, RSVP e presentes.
- Dashboard funcional em HTML/CSS/JS com gestão de confirmações, grupos, mensagens, músicas, mídia e edição do evento.
- APIs serverless para evento, dashboard, submissões e autenticação simples.
- Integração com Supabase no backend para leitura e persistência de dados.
- Carregamento dinâmico do convite por `slug` via `api/event-config`.
- Loading screen, fallback para `site.json` e base de testes de integração já existente.
- Migrações SQL já iniciadas para a estrutura multi-tenant, com `events` e `event_gifts`.

### O que o produto ainda não é

- Ainda não é uma plataforma aberta para qualquer casal criar conta sozinho.
- Ainda não existe autenticação SaaS por casal via Supabase Auth.
- Ainda não existe landing page comercial com cadastro real.
- Ainda não existe controle de plano, cobrança ou liberação de features por assinatura ou pagamento.

### Conclusão prática

O roadmap correto não começa em criar dashboard nem em migrar o convite
para o Supabase. Essas bases já existem.

O roadmap correto começa em:

1. fechar a camada de multi-tenant;
2. abrir aquisição e cadastro;
3. ativar monetização;
4. preparar lançamento.

---

## DIRETRIZES DO MVP REAL

### Decisões técnicas atualizadas

- Landing page: HTML/CSS/JS estático no Vercel.
- Dashboard do casal: manter a base atual em HTML/CSS/JS + APIs serverless.
- Backend e banco: Supabase.
- Storage: Supabase Storage.
- Pagamento MVP: Mercado Pago.
- E-mail transacional: Resend.
- Hospedagem e domínio: Vercel + domínio próprio.

### Decisões de produto para o MVP

- Lançar primeiro para casais finais, não para agências.
- Plano free pode existir, mas só depois que autenticação, cobrança e limites estiverem sólidos.
- Não migrar para Next.js agora sem necessidade clara.
- Não ampliar escopo com app mobile, white label ou Twilio antes do primeiro ciclo de venda.

---

## STATUS EXECUTADO (MAIO 2026)

- Cadastro SaaS funcional com criação de usuário, profile e evento inicial.
- Dashboard autenticado com Supabase Auth, sessão persistida, login/logout e isolamento por usuário.
- Edição de configuração do convite funcionando com persistência no banco.
- Navegação interna do convite preservando contexto por slug entre páginas estáticas.
- Upload de mídia funcional com criação de estrutura no Supabase Storage por evento.
- Fluxo de publicação por slug validado em teste manual de ponta a ponta.

---

## ROADMAP AJUSTADO

## FASE 1 — Fechar a base SaaS

**Objetivo:** transformar a base atual em uma plataforma multi-casal segura.

### DEV

- [x] Criar a tabela `profiles` vinculada ao `auth.users`.
- [x] Criar trigger `handle_new_user` para popular `profiles` no cadastro.
- [x] Revisar a modelagem atual para operar sobre `events` como entidade principal, sem recriar `weddings`.
- [x] Padronizar ownership entre `profiles`, `events` e demais tabelas relacionadas.
- [x] Substituir a autenticação simples do dashboard por Supabase Auth real.
- [x] Implementar sessão do casal no dashboard com login, logout e proteção de rotas.
- [ ] Configurar ambiente de produção separado no Supabase.
- [x] Configurar variáveis de ambiente de produção no Vercel.
- [x] Validar RLS de ponta a ponta com usuário autenticado vendo apenas o próprio evento.

**Entregável:** qualquer casal autenticado consegue entrar com a própria conta e acessar apenas seu evento.

---

## FASE 2 — Aquisição e onboarding

**Objetivo:** permitir que um casal descubra o produto, se cadastre e publique o primeiro convite sem intervenção manual.

### DEV

- [x] Criar landing page comercial com CTA para cadastro.
- [x] Implementar formulário de cadastro com nome, WhatsApp, e-mail e senha.
- [x] Integrar cadastro com Supabase Auth.
- [x] Implementar confirmação de e-mail.
- [x] Criar página de confirmação e estados de sucesso e erro.
- [x] Criar fluxo de recuperação de senha.
- [x] Criar wizard inicial no dashboard para dados do casal, evento e tema.
- [ ] Adicionar coluna `slug` (unique, text) em `events`.
- [ ] Criar migração SQL para slugs existentes (gerar automático se vazio).
- [ ] Criar endpoint `/api/check-slug` para validação em tempo real.
- [ ] Configurar reescrita de URL em `vercel.json` (rewrite /:slug para /index.html?slug=:slug).
- [ ] Implementar rate-limit por IP em `/api/check-slug` (máx 10 req/min).
- [ ] Integrar validação de slug no wizard etapa 2 com debounce.
- [ ] Adicionar `robots.txt` com `Disallow: /` para não indexar (optional).
- [ ] Testar fluxo: slug personalizado carrega corretamente com token de convidado.
- [x] Implementar publicação do convite por `slug`.
- [x] Garantir que o convite publicado carregue por API e mantenha fallback controlado.

**Entregável:** casal entra na landing, cria conta, confirma e-mail, configura o básico com URL personalizada e publica o convite sozinho.

---

## FASE 3 — Monetização e limites de plano

**Objetivo:** converter uso em receita com regras simples e operáveis.

### DEV

- [ ] Criar campos de plano e vencimento em `profiles`.
- [ ] Implementar link de pagamento por plano no Mercado Pago.
- [ ] Criar webhook do Mercado Pago para atualizar plano do usuário.
- [ ] Implementar liberação de features por plano no dashboard.
- [ ] Implementar limite de quantidade de convites e recursos no plano free.
- [ ] Implementar marca d'água e restrições visuais do plano free.
- [ ] Criar página interna de upgrade no dashboard.
- [ ] Criar fluxo de e-mail após pagamento aprovado.
- [ ] Registrar eventos de erro e conciliação mínima para pagamentos não confirmados.

**Entregável:** casal paga, plano é atualizado e o dashboard libera automaticamente os recursos corretos.

---

## FASE 4 — Lançamento controlado

**Objetivo:** validar operação real com poucos clientes e corrigir o que travar conversão, onboarding ou entrega.

### DEV

- [ ] Rodar testes manuais em Android, iPhone e desktop.
- [ ] Testar fluxo completo: cadastro, confirmação, publicação, RSVP e upgrade.
- [ ] Validar loading, cache e fallback em conexão móvel ruim.
- [ ] Adicionar analytics básico de produto e conversão.
- [ ] Revisar logs de erro dos endpoints principais.
- [ ] Fechar checklist de segurança mínima para produção.
- [ ] Corrigir os gargalos encontrados no piloto antes de ampliar aquisição.

**Entregável:** MVP estável para os primeiros clientes pagantes.

---

## BACKLOG ADIADO

Esses itens não entram no caminho crítico do MVP:

- Plano agência.
- White label.
- Domínio personalizado por casal.
- WhatsApp automatizado via Twilio.
- App mobile.
- Internacionalização.
- Reescrita do dashboard em framework sem necessidade comprovada.

---

## MÉTRICAS DE VALIDAÇÃO

- 1 casal externo consegue criar conta sem ajuda técnica.
- 1 casal externo consegue publicar o convite no mesmo dia do cadastro.
- 1 pagamento real é processado e libera o plano automaticamente.
- 3 a 5 casais piloto usam a plataforma sem intervenção de desenvolvimento no fluxo principal.
- O tempo médio para publicar o primeiro convite fica abaixo de 20 minutos.

---

## PRIORIDADE IMEDIATA

### Ordem correta de execução agora

1. Fechar autenticação SaaS real e `profiles`.
2. Colocar landing page + cadastro no ar.
3. Criar wizard de onboarding e publicação.
4. Ligar pagamento e controle de plano.
5. Rodar piloto com poucos casais.

### O que não faz sentido fazer agora

- Reescrever o dashboard do zero.
- Criar novas features de convite antes de abrir aquisição.
- Investir em branding sofisticado antes de ter nome, domínio e landing funcional.
- Expandir para agência antes do primeiro ciclo de vendas para casais.