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
- [ ] Configurar variáveis de ambiente de produção no Vercel.
- [x] Validar RLS de ponta a ponta com usuário autenticado vendo apenas o próprio evento.

**Entregável:** qualquer casal autenticado consegue entrar com a própria conta e acessar apenas seu evento.

### DESIGN / SOCIAL MEDIA / OPERAÇÃO

| Frente | Entrega | Objetivo | Prioridade |
|---|---|---|---|
| Marca | Definir nome da plataforma | Permitir domínio, identidade visual e comunicação consistente | Alta |
| Marca | Definir logo provisória e direção visual | Evitar travar landing e redes sociais esperando branding completo | Alta |
| Comercial | Revisar posicionamento do MVP | Deixar claro que o produto vende convite premium com gestão simples | Alta |
| Comercial | Consolidar planos iniciais e o que cada um libera | Evitar promessa de feature que ainda não existe | Alta |
| Operação | Comprar domínio principal | Destravar publicação real e e-mails | Alta |
| Operação | Criar conta no Resend | Preparar confirmação de e-mail e comunicações transacionais | Alta |

---

## FASE 2 — Aquisição e onboarding

**Objetivo:** permitir que um casal descubra o produto, se cadastre e publique o primeiro convite sem intervenção manual.

### DEV

- [ ] Criar landing page comercial com CTA para cadastro.
- [x] Implementar formulário de cadastro com nome, WhatsApp, e-mail e senha.
- [x] Integrar cadastro com Supabase Auth.
- [ ] Implementar confirmação de e-mail.
- [ ] Criar página de confirmação e estados de sucesso e erro.
- [ ] Criar fluxo de recuperação de senha.
- [ ] Criar wizard inicial no dashboard para dados do casal, evento e tema.
- [ ] Implementar verificação de disponibilidade de `slug`.
- [x] Implementar publicação do convite por `slug`.
- [x] Garantir que o convite publicado carregue por API e mantenha fallback controlado.

**Entregável:** casal entra na landing, cria conta, confirma e-mail, configura o básico e publica o convite sozinho.

### DESIGN / SOCIAL MEDIA / CONTEÚDO

| Frente | Entrega | Objetivo | Prioridade |
|---|---|---|---|
| Landing | Estruturar copy de hero, benefícios, prova social e planos | Melhorar conversão do cadastro | Alta |
| Landing | Definir screenshots ou mockups do produto | Dar clareza visual sem depender de texto demais | Alta |
| Conteúdo | Escrever textos dos e-mails de confirmação e boas-vindas | Manter tom de marca consistente | Média |
| Conteúdo | Produzir FAQ comercial inicial | Reduzir dúvidas de preço, prazo e funcionamento | Média |
| Social media | Definir identidade visual mínima para posts | Preparar tráfego orgânico e anúncios básicos | Média |
| Social media | Criar 6 a 9 peças iniciais para Instagram | Ter material pronto para pré-lançamento | Média |

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

### DESIGN / SOCIAL MEDIA / COMERCIAL

| Frente | Entrega | Objetivo | Prioridade |
|---|---|---|---|
| Comercial | Definir tabela final de preços do MVP | Dar previsibilidade à oferta e ao checkout | Alta |
| Comercial | Escrever textos de upgrade e comparação entre planos | Aumentar conversão dentro do dashboard | Alta |
| Conteúdo | Criar página simples de política de privacidade | Reduzir risco jurídico e passar confiança | Alta |
| Conteúdo | Criar página simples de termos de uso | Fechar o básico legal do MVP | Alta |
| Social media | Criar campanha de lançamento dos planos | Gerar tráfego com oferta clara | Média |
| Social media | Produzir depoimentos ou estudos de caso iniciais | Criar prova social real | Média |

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

### DESIGN / SOCIAL MEDIA / OPERAÇÃO

| Frente | Entrega | Objetivo | Prioridade |
|---|---|---|---|
| Operação | Definir rotina de suporte por WhatsApp | Evitar atendimento improvisado | Alta |
| Operação | Criar roteiro de onboarding manual para os primeiros clientes | Reduzir atrito no piloto | Alta |
| Social media | Planejar calendário de 30 dias de conteúdo | Sustentar aquisição após lançamento | Média |
| Social media | Separar criativos para tráfego pago teste | Medir CAC inicial com investimento pequeno | Média |
| Comercial | Selecionar 3 a 5 casais piloto | Validar produto com contexto real | Alta |
| Comercial | Estruturar coleta de feedback dos pilotos | Priorizar evolução com base em uso real | Alta |

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