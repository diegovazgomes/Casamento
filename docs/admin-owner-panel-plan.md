# Plano de Criacao do Painel Admin da Plataforma

## Objetivo

Criar um painel administrativo interno para o dono da Devazi acompanhar a saude geral da plataforma, incluindo contas criadas, planos ativos, receita, uso dos convites, acessos da landing page e funil comercial.

Este painel e diferente do `dashboard.html`, que e o painel do casal. O novo painel deve ser restrito ao administrador da plataforma e mostrar dados agregados de todos os usuarios, eventos e pagamentos.

## Escopo Principal

O painel admin deve responder rapidamente perguntas como:

- Quantas contas foram criadas?
- Quantos usuarios estao no plano Free?
- Quantos usuarios estao no plano Premium?
- Quantos eventos foram criados?
- Quantos eventos estao ativos?
- Quantos pagamentos foram concluidos?
- Qual a receita acumulada?
- Quantas pessoas acessaram a landing page?
- Quantas pessoas iniciaram cadastro?
- Quantas pessoas vizualizaram o convite de exemplo
- Quantas pessoas concluiram cadastro?
- Qual a conversao de Free para Premium?
- Quais temas e layouts sao mais usados?
- Quais musicas mais usadas?
- Quais convites tem mais audiencia?
- QUais clientes aceitaram receber marketing pelo RSVP?

## Fora de Escopo Inicial

Para manter o MVP seguro e viavel, ficam fora da primeira entrega:

- Edicao manual de dados de clientes pelo admin.
- Cancelamento ou alteracao manual de plano.
- Envio de e-mails ou WhatsApp pelo painel.
- Dashboards financeiros avancados com impostos, notas fiscais ou conciliacao completa.
- Analytics individualizado de convidados para uso comercial.
- Uso de dados de convidados para marketing da Devazi.

## Principios do Painel

- O painel deve ser interno, operacional e direto.
- A primeira tela deve mostrar indicadores de negocio, nao uma pagina promocional.
- Os dados devem ser agregados sempre que possivel.
- O painel nao deve expor comportamento individual de convidados.
- O acesso deve ser protegido por permissao explicita de admin.
- O painel nao deve depender do `site.json`; ele deve consultar dados globais do banco.
- As metricas devem ser calculadas no backend, nunca diretamente no frontend com chaves sensiveis.
- O design deve ser próximo do dashboard que já existe para o casal organizador do evento (dashboard.html)
- Nao criar novas Vercel Serverless Functions. O projeto ja esta no limite de 12 functions.
- Novas acoes admin devem reutilizar functions existentes com roteamento por `action`.

## Dados Existentes que Podem Ser Usados

### Contas

Fonte principal: tabela `profiles`.

Campos relevantes:

- `id`
- `couple_name`
- `email`
- `whatsapp`
- `plan`
- `expires_at`
- `stripe_customer_id`
- `is_demo_account`, se presente no ambiente atual
- `created_at`
- `updated_at`

Metricas possiveis:

- Total de contas.
- Contas criadas por periodo.
- Contas Free.
- Contas Premium.
- Contas demo.
- Contas reais.
- Premiums expirando.
- Premiums expirados.

### Eventos

Fonte principal: tabela `events`.

Campos relevantes:

- `id`
- `slug`
- `user_id`
- `couple_names`
- `event_date`
- `active_theme`
- `active_layout`
- `is_active`
- `config`
- `created_at`
- `updated_at`

Metricas possiveis:

- Total de eventos.
- Eventos ativos.
- Eventos inativos.
- Eventos criados por periodo.
- Temas mais usados.
- Layouts mais usados.
- Eventos sem data configurada.
- Eventos com convite publicado.

### Pagamentos

Fonte principal: tabela `payment_events`.

Campos relevantes:

- `id`
- `user_id`
- `stripe_event_id`
- `event_type`
- `amount_total`
- `currency`
- `plan`
- `processed_at`

Metricas possiveis:

- Total de pagamentos processados.
- Receita acumulada.
- Receita por periodo.
- Ticket medio.
- Upgrades para Premium.
- Ultimos pagamentos.

### Audiencia dos Convites

Fonte principal: tabela `guest_views`.

Campos relevantes esperados:

- `event_id`
- `token_id`
- `page_path`
- `session_id`
- `duration_seconds`
- `device_type`
- `opened_at` ou `created_at`
- `left_at`
- `referrer_page`

Metricas possiveis:

- Total de visualizacoes dos convites.
- Visualizacoes por evento.
- Paginas mais acessadas.
- Tempo medio por pagina.
- Dispositivos mais usados.
- Convites com maior audiencia.

## Dados Novos Necessarios

Para medir a landing page e o funil comercial, sera necessario criar uma tabela de analytics da plataforma.

### Nova tabela sugerida: `platform_events`

Campos sugeridos:

```sql
CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Eventos iniciais sugeridos:

- `landing_view`
- `landing_cta_click`
- `signup_started`
- `signup_completed`
- `login_started`
- `login_completed`
- `checkout_started`
- `checkout_completed`
- `dashboard_opened`

Metricas habilitadas:

- Acessos da landing.
- Cliques em CTA.
- Inicio de cadastro.
- Cadastro concluido.
- Checkout iniciado.
- Checkout concluido.
- Conversao landing para cadastro.
- Conversao cadastro para Premium.
- Origem de trafego por UTM.

## Seguranca e Permissao

O painel deve ter autenticacao separada por permissao de administrador.

### Opcao recomendada

Adicionar uma tabela `admin_users`.

```sql
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Regras:

- Apenas usuarios presentes em `admin_users` podem acessar as acoes admin.
- O frontend do painel nunca acessa o Supabase diretamente com permissao ampla.
- Todas as consultas globais rodam em endpoints serverless usando service role.
- As APIs devem retornar apenas os campos necessarios para a tela.
- Dados sensiveis devem ser mascarados quando exibidos em listas.

### Endpoints e actions sugeridos

Nao criar arquivos novos em `api/` para nao aumentar a contagem de functions na Vercel.

- `GET /api/dashboard/profile?action=admin-overview`
- `GET /api/dashboard/profile?action=admin-accounts`
- `GET /api/dashboard/profile?action=admin-events`
- `GET /api/dashboard/profile?action=admin-revenue`
- `GET /api/dashboard/profile?action=admin-acquisition`
- `GET /api/dashboard/profile?action=admin-product-usage`
- `POST /api/submissions` com `table: "platform_events"` para coleta de eventos da landing/funil.

Cada endpoint deve:

- Exigir `Authorization: Bearer <token>`.
- Validar o usuario via Supabase Auth.
- Confirmar permissao na tabela `admin_users`.
- Consultar dados agregados com service role.
- Retornar JSON sem dados excessivos.

## Estrutura de Arquivos

Arquivos novos sugeridos:

- `sisi.html`
- `assets/js/admin.js`
- `assets/js/admin-api.js`
- `assets/js/admin-charts.js`, se houver graficos sem biblioteca externa
- Nenhum novo arquivo em `api/` para nao criar function adicional na Vercel.
- Reutilizar `api/dashboard/profile.js` para consultas admin.
- Reutilizar `api/submissions.js` para coleta de analytics da plataforma.
- `docs/migrations/010_admin_users.sql`
- `docs/migrations/011_platform_events.sql`

Observacao: se o painel crescer muito, o ideal e separar o CSS em `assets/css/admin.css` em vez de deixar tudo inline no `sisi.html`.

## Navegacao do Painel

Menu sugerido:

- `Resumo`
- `Aquisicao`
- `Contas`
- `Eventos`
- `Receita`
- `Uso do Produto`
- `Audiencia`
- `Operacao`

## Tela 1: Resumo

Objetivo: mostrar a saude geral da plataforma em menos de 30 segundos.

Cards principais:

- Contas totais.
- Contas criadas nos ultimos 30 dias.
- Premium ativos.
- Taxa Free para Premium.
- Eventos ativos.
- Receita acumulada.
- Receita dos ultimos 30 dias.
- Acessos da landing nos ultimos 30 dias.

Blocos secundarios:

- Ultimos cadastros.
- Ultimos upgrades.
- Eventos mais recentes.
- Alertas operacionais.

Alertas possiveis:

- Pagamento recebido sem perfil atualizado.
- Conta Premium expirada.
- Evento sem slug valido.
- Evento ativo sem data.
- Aumento incomum de erro no cadastro.

## Tela 2: Aquisicao

Objetivo: acompanhar o funil comercial.

Metricas:

- Landing views.
- CTA clicks.
- Signup starts.
- Signup completed.
- Checkout started.
- Checkout completed.
- Conversao landing para cadastro.
- Conversao cadastro para Premium.

Filtros:

- Periodo.
- UTM source.
- UTM campaign.
- Dispositivo.

Graficos:

- Linha de acessos por dia.
- Funil de conversao.
- Tabela de campanhas.

## Tela 3: Contas

Objetivo: listar e auditar clientes.

Colunas:

- Casal.
- Email mascarado parcialmente.
- WhatsApp mascarado parcialmente.
- Plano.
- Data de criacao.
- Data de expiracao.
- Quantidade de eventos.
- Ultima atualizacao.

Filtros:

- Plano.
- Demo ou real.
- Criado em periodo.
- Premium expirado.

Acoes iniciais:

- Abrir detalhes.
- Copiar ID.
- Abrir evento publico.

## Tela 4: Eventos

Objetivo: acompanhar a base de convites criados.

Colunas:

- Casal.
- Slug.
- Plano do dono.
- Data do casamento.
- Tema.
- Layout.
- Status ativo.
- Criado em.
- Atualizado em.

Metricas:

- Eventos por tema.
- Eventos por layout.
- Eventos ativos por periodo.
- Eventos sem configuracao minima.

## Tela 5: Receita

Objetivo: acompanhar upgrades e receita.

Metricas:

- Receita acumulada.
- Receita no periodo.
- Pagamentos concluidos.
- Ticket medio.
- Premium ativos.
- Premium expirados.

Tabelas:

- Ultimos pagamentos.
- Pagamentos por periodo.
- Usuarios Premium por vencimento.

Observacao: no MVP, a receita pode ser calculada com base em `payment_events.amount_total`. Conciliacao financeira completa com Stripe fica fora do escopo inicial.

## Tela 6: Uso do Produto

Objetivo: entender quais recursos os casais usam.

Metricas:

- Temas mais usados.
- Layouts mais usados.
- Eventos com RSVP habilitado.
- Eventos com presentes habilitados.
- Eventos com Pix configurado.
- Eventos com pagamento por cartao habilitado.
- Eventos com galeria preenchida.
- Eventos com paginas extras habilitadas.

Fontes:

- `events.active_theme`
- `events.active_layout`
- `events.config`

## Tela 7: Audiencia

Objetivo: mostrar uso agregado dos convites.

Metricas:

- Total de views em convites.
- Views por evento.
- Paginas mais acessadas.
- Tempo medio por pagina.
- Dispositivo mais usado.
- Eventos com maior audiencia.

Cuidados:

- Nao exibir comportamento individual de convidados.
- Evitar mostrar token individual.
- Priorizar agregados por evento, pagina e periodo.

## Fase 1: MVP com Dados Existentes

Entrega:

- Criar `sisi.html`.
- Criar `assets/js/admin.js`.
- Criar autenticacao de admin.
- Criar tabela `admin_users`.
- Criar action `admin-overview` em `/api/dashboard/profile`.
- Exibir resumo com:
  - total de contas;
  - contas Free;
  - contas Premium;
  - eventos criados;
  - eventos ativos;
  - receita acumulada;
  - ultimos cadastros;
  - ultimos pagamentos.

Criterios de aceite:

- Usuario sem permissao de admin nao acessa o painel.
- Nenhuma chave sensivel aparece no frontend.
- Painel carrega dados reais do Supabase.
- Erros aparecem de forma amigavel.
- Funciona em desktop e mobile.

## Fase 2: Analytics da Landing e Funil

Entrega:

- Criar tabela `platform_events`.
- Reutilizar `/api/submissions` para coleta de eventos.
- Instrumentar `landing.html`.
- Instrumentar `signup.html`.
- Instrumentar checkout iniciado.
- Consolidar action `admin-acquisition` em `/api/dashboard/profile`.

Criterios de aceite:

- Acesso na landing gera `landing_view`.
- Clique em CTA gera `landing_cta_click`.
- Inicio de cadastro gera `signup_started`.
- Cadastro concluido gera `signup_completed`.
- Checkout iniciado gera `checkout_started`.
- Checkout pago gera `checkout_completed` ou usa `payment_events`.
- Painel mostra funil por periodo.

## Fase 3: Operacao e Diagnosticos

Entrega:

- Tela de contas.
- Tela de eventos.
- Tela de receita.
- Tela de uso do produto.
- Tela de audiencia agregada.
- Alertas operacionais.

Criterios de aceite:

- Admin consegue localizar uma conta.
- Admin consegue abrir detalhes de um evento.
- Admin consegue identificar Premium expirados.
- Admin consegue ver temas e layouts mais usados.
- Admin consegue acompanhar eventos com maior audiencia.

## Consideracoes de Privacidade

O painel admin pode usar dados agregados de convidados para melhorar a plataforma, mas deve evitar:

- Exibir ranking individual de convidados.
- Exibir jornada individual de um convidado.
- Associar paginas vistas a nome de convidado.
- Usar dados de convidados para marketing da Devazi.
- Exportar dados comportamentais individualizados sem necessidade operacional clara.

Para a landing page e funil comercial, os dados sao da propria plataforma e podem ser usados para crescimento, desde que respeitem LGPD, termos de uso e politica de privacidade.

## Decisoes Pendentes

- O painel admin tera URL publica protegida, como `/sisi.html`, ou ficara atras de uma rota menos obvia? Rota menos óbvia possivel
- O primeiro admin sera criado manualmente no Supabase? Teremos apenas um admin que será eu
- Vamos usar uma tabela `admin_users` ou adicionar `role` em `profiles`? Me ajude a decidir
- O painel precisa permitir acao manual em contas ou sera somente leitura no MVP? Somente leitura
- A landing deve coletar UTMs desde a primeira fase de analytics? SIm
- Os graficos serao feitos com CSS/JS nativo ou sera discutida uma biblioteca externa? CSS/JS

## Recomendacao Final

Comecar pela Fase 1. Ela entrega valor rapido usando dados que o projeto ja possui e cria a fundacao segura do painel admin.

Depois disso, implementar a Fase 2 para medir landing page e funil comercial. Essa etapa transforma o painel de uma visao operacional em uma ferramenta real de crescimento.

Não deve ser alterada as funcionalidades que já existem e estão implementadas.


