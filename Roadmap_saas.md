# ROADMAP — Plataforma SaaS de Convites Digitais
# Documento estratégico e técnico
# Criado: Abril 2026

---

## VISÃO DO PRODUTO

Transformar o convite do casamento de Siannah & Diego numa plataforma
onde qualquer casal pode criar, personalizar e compartilhar seu convite
digital premium — sem precisar de desenvolvedor.

---

## PLANOS E PREÇOS

### Lógica de precificação

O mercado brasileiro aceita bem o modelo freemium com limitações claras.
A conversão de free para pago acontece quando o casal sente a limitação
no momento que mais importa — quando está próximo do casamento.

### Plano Free — Teste
**Preço: R$ 0**
- 1 convite ativo
- Tema padrão (classic-warm) — sem escolha
- Até 30 convidados cadastrados
- RSVP com WhatsApp (sem banco de dados)
- Sem domínio personalizado
- Sem painel de gestão de convidados
- Sem lista de presentes
- Marca d'água discreta "Feito com [nome da plataforma]"
- Válido por 60 dias após o cadastro

**Objetivo:** Deixar o casal experimentar a experiência do convite.
A limitação de tema e convidados força a conversão.

---

### Plano Essencial
**Preço: R$ 297 (pagamento único)**
- 1 convite ativo
- Todos os temas disponíveis
- Convidados ilimitados
- RSVP com banco de dados (Supabase)
- Dashboard com confirmações em tempo real
- Lista de presentes com Pix
- Suporte por WhatsApp em horário comercial
- Válido até o dia do casamento + 30 dias
- Sem marca d'água

**Objetivo:** Ticket único sem recorrência — mais fácil de vender para
casais que não querem assinatura.

---

### Plano Premium
**Preço: R$ 497 (pagamento único)**
Tudo do Essencial, mais:
- Domínio personalizado (ex: siannah-diego.com.br)
- Upload de música própria do casal
- Gestão completa de convidados (links únicos por grupo)
- Controle de acompanhantes e crianças
- Exportação CSV da lista de confirmados
- Lembretes automáticos via WhatsApp (quando Twilio for ativado)
- Suporte prioritário

**Objetivo:** Para casais que querem a experiência completa.
É o plano que o seu próprio casamento estaria.

---

### Plano Agência (futuro — v2)
**Preço: R$ 197/mês**
- Até 10 convites simultâneos
- Painel multi-casamento
- White label (sem marca da plataforma)
- Para fotógrafos e cerimonialistas que querem oferecer como serviço

**Objetivo:** B2B — não lançar no MVP, validar depois.

---

## FLUXO DE CADASTRO E CRIAÇÃO

```
Landing page
     ↓
Casal clica em "Criar meu convite"
     ↓
Formulário de cadastro:
  - Nome completo
  - WhatsApp (com DDD)
  - E-mail
  - Senha
     ↓
Conta criada no Supabase Auth
     ↓
E-mail de confirmação enviado
     ↓
Casal confirma o e-mail
     ↓
Redirecionado para o painel (dashboard)
     ↓
Wizard de criação do convite (3 passos):
  Passo 1: Dados do casal (nomes, data, local)
  Passo 2: Escolher tema visual
  Passo 3: Confirmar e publicar
     ↓
Convite publicado em:
  [slug].seudominio.com.br
     ↓
Casal recebe link para compartilhar
```

---

## ESTRUTURA NO SUPABASE

### Tabelas necessárias para o MVP

```sql
-- Usuários (gerenciado pelo Supabase Auth)
-- auth.users já existe — não criar manualmente

-- Perfis dos usuários (dados extras além do Auth)
create table profiles (
  id            uuid references auth.users(id) primary key,
  full_name     text not null,
  whatsapp      text,
  plan          text default 'free',
  -- 'free' | 'essencial' | 'premium' | 'agencia'
  plan_expires_at timestamp with time zone,
  created_at    timestamp with time zone default now()
);

-- Convites
create table weddings (
  id            uuid default gen_random_uuid() primary key,
  owner_id      uuid references auth.users(id) not null,
  slug          text unique not null,
  -- URL do convite: slug.seudominio.com.br
  -- Ex: siannah-diego
  couple_name1  text,
  couple_name2  text,
  event_date    date,
  event_time    text,
  location_name text,
  location_city text,
  maps_link     text,
  pix_key       text,
  card_link     text,
  whatsapp_phone text,
  active_theme  text default 'classic-warm',
  hero_image_url text,
  is_published  boolean default false,
  created_at    timestamp with time zone default now(),
  updated_at    timestamp with time zone default now()
);

-- Uma linha por usuário no plan free (limite de 1 convite)
-- RLS garante que owner_id = auth.uid()
```

### RLS (Row Level Security)

```sql
-- profiles: cada usuário vê e edita só o próprio perfil
alter table profiles enable row level security;

create policy "user manages own profile"
  on profiles for all
  using (auth.uid() = id);

-- weddings: cada usuário gerencia só seus convites
alter table weddings enable row level security;

create policy "user manages own weddings"
  on weddings for all
  using (auth.uid() = owner_id);

-- Convites publicados são públicos (convidados acessam sem login)
create policy "public can read published weddings"
  on weddings for select
  using (is_published = true);
```

### Trigger para criar profile automaticamente

```sql
-- Toda vez que um usuário se cadastra, cria o profile
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, whatsapp)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'whatsapp'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

---

## DOMÍNIO PRÓPRIO

### Estrutura de URLs

```
seudominio.com.br              → Landing page
app.seudominio.com.br          → Painel do casal (dashboard)
convite.seudominio.com.br/[slug] → Convite público
```

### Por que subdomínio para o convite

O convidado abre `convite.seudominio.com.br/siannah-diego`.
Limpo, profissional, sem Vercel na URL.
O Vercel suporta domínios customizados no plano Hobby — sem custo adicional.

### Como configurar

1. Compra o domínio no Registro.br ou GoDaddy
2. Aponta os DNS para o Vercel:
   - `@` → CNAME para `cname.vercel-dns.com`
   - `app` → CNAME para `cname.vercel-dns.com`
   - `convite` → CNAME para `cname.vercel-dns.com`
3. No Vercel: Settings → Domains → adiciona cada subdomínio
4. SSL/HTTPS automático via Vercel (Let's Encrypt)

---

## SEGURANÇA MÍNIMA PARA MVP

### O que implementar agora

**Autenticação via Supabase Auth**
- Login com e-mail + senha
- Confirmação de e-mail obrigatória antes de publicar o convite
- JWT token com expiração de 7 dias
- Refresh token automático

**RLS no banco de dados**
- Cada casal acessa só os próprios dados
- Convites não publicados são invisíveis para o público
- Já definido acima

**Rate limiting básico**
- Vercel tem rate limiting nativo nas Edge Functions
- Limitar criação de conta: máx 5 por IP por hora
- Limitar login: máx 10 tentativas por IP por hora (Supabase faz isso nativo)

**Variáveis de ambiente**
- Nenhuma chave secreta no código
- SUPABASE_SERVICE_ROLE_KEY apenas no servidor, nunca no frontend
- SUPABASE_ANON_KEY pode ficar no frontend (já é pública)

**Validação de slug**
- Slug só aceita letras, números e hífens
- Verificar disponibilidade antes de salvar
- Máximo 60 caracteres

### O que NÃO implementar no MVP (complexidade desnecessária)

- 2FA (autenticação em dois fatores)
- OAuth com Google/Facebook
- Logs de auditoria
- WAF (Web Application Firewall)
- Backups automáticos além do Supabase padrão

---

## STACK TÉCNICA DO MVP

```
Landing page:     HTML/CSS estático no Vercel (sem framework)
Dashboard:        Next.js no Vercel
Backend/Auth:     Supabase
Banco de dados:   PostgreSQL via Supabase
Storage:          Supabase Storage (fotos, QR codes)
Pagamento:        Mercado Pago (link de pagamento simples no MVP)
E-mail:           Resend (gratuito até 3.000 e-mails/mês)
Domínio:          Registro.br
DNS/SSL:          Vercel (automático)
```

### Por que Mercado Pago no MVP e não Stripe

- Casal brasileiro paga em real, sem conversão
- Integração mais simples para começar
- Link de pagamento sem código (fase 1)
- API completa quando precisar automatizar (fase 2)

---

## ROADMAP POR ETAPAS

---

### ETAPA 0 — Fundação (Semana 1)
**Objetivo:** Infraestrutura básica no ar

- [ ] Comprar domínio
- [ ] Configurar DNS no Vercel
- [ ] Criar projeto Supabase de produção (separado do de desenvolvimento)
- [ ] Criar tabelas `profiles` e `weddings` com RLS
- [ ] Criar trigger `handle_new_user`
- [ ] Configurar variáveis de ambiente no Vercel (prod)
- [ ] Configurar conta no Resend para e-mails transacionais

**Entregável:** Infraestrutura pronta para receber usuários

---

### ETAPA 1 — Landing Page (Semana 1-2)
**Objetivo:** Página de vendas premium no ar

- [ ] Design da landing page (hero, como funciona, planos, depoimentos)
- [ ] Formulário de cadastro com nome, WhatsApp, e-mail, senha
- [ ] Integração com Supabase Auth no cadastro
- [ ] E-mail de confirmação via Resend
- [ ] Página de confirmação de e-mail
- [ ] Link para o Mercado Pago por plano
- [ ] Responsivo mobile
- [ ] Publicar em `seudominio.com.br`

**Entregável:** Casal consegue se cadastrar e ir para o pagamento

---

### ETAPA 2 — Dashboard básico (Semana 2-3)
**Objetivo:** Casal consegue criar e publicar o convite

- [ ] Login com e-mail + senha
- [ ] Wizard de criação do convite (3 passos)
- [ ] Seletor de tema visual
- [ ] Upload de foto do casal (Supabase Storage)
- [ ] Preview do convite em tempo real
- [ ] Publicar convite → gera URL `convite.seudominio.com.br/[slug]`
- [ ] Painel de confirmações de presença (já funciona via Supabase)
- [ ] Publicar em `app.seudominio.com.br`

**Entregável:** Casal consegue criar e compartilhar o convite sozinho

---

### ETAPA 3 — Convite dinâmico (Semana 3-4)
**Objetivo:** Convite lê dados do Supabase em vez do site.json

- [ ] Migrar `script.js` para buscar dados da tabela `weddings`
- [ ] Cache local com localStorage para carregamento rápido
- [ ] Fallback para site.json se Supabase falhar
- [ ] Loading screen com timeout de 5s
- [ ] Testar em mobile com conexão 3G

**Entregável:** Convite 100% dinâmico — casal edita no dashboard e atualiza instantaneamente

---

### ETAPA 4 — Pagamento e planos (Semana 4)
**Objetivo:** Monetização funcionando

- [ ] Webhook do Mercado Pago → atualiza `profiles.plan`
- [ ] Middleware no dashboard verifica plano antes de liberar features
- [ ] Limite de 1 convite para plano free
- [ ] Marca d'água no plano free
- [ ] Página de upgrade dentro do dashboard
- [ ] E-mail de boas-vindas após pagamento confirmado

**Entregável:** Receita funcionando automaticamente

---

### ETAPA 5 — Polish e lançamento (Semana 5)
**Objetivo:** Produto pronto para os primeiros clientes pagantes

- [ ] Testes em 3 dispositivos diferentes (Android, iPhone, desktop)
- [ ] Teste de fluxo completo: cadastro → pagamento → convite publicado
- [ ] Página de política de privacidade (LGPD)
- [ ] Página de termos de uso
- [ ] Suporte básico configurado (WhatsApp Business)
- [ ] Analytics básico (Vercel Analytics — gratuito)
- [ ] Primeiro cliente piloto (não o seu casamento — alguém do círculo)

**Entregável:** MVP lançado para os primeiros clientes reais

---

## MÉTRICAS DE SUCESSO DO MVP

```
Semana 1:  Infraestrutura no ar
Semana 2:  Primeiro cadastro externo funcionando
Semana 3:  Primeiro convite criado por alguém que não é você
Semana 4:  Primeiro pagamento processado automaticamente
Semana 5:  5 clientes ativos no produto
Mês 2:     R$ 2.000 em receita
Mês 3:     R$ 5.000 em receita (meta conservadora)
Mês 6:     R$ 10.000/mês (meta principal)
```

---

## RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Convite quebrar perto do casamento | Média | Manter site.json como fallback |
| Supabase fora do ar | Baixa | Cache local no browser |
| Mercado Pago rejeitar pagamento | Média | Aceitar Pix manual no início |
| Slug já existir | Alta | Validação em tempo real no cadastro |
| E-mail de confirmação ir para spam | Alta | Configurar SPF/DKIM no Resend |
| Casal editar e quebrar o convite | Média | Preview antes de publicar |

---

## DECISÕES ADIADAS (não bloqueia o MVP)

- Domínio personalizado por casal (ex: siannah-diego.com.br)
- Links únicos por convidado (item 3.2 do roadmap original)
- WhatsApp automatizado via Twilio
- Painel multi-casamento para agências
- App mobile
- Migração de temas para o Supabase
- Internacionalização (Portugal, América Latina)

---

## PRÓXIMO PASSO IMEDIATO

Antes de escrever qualquer código novo:

1. Definir o nome da marca e comprar o domínio
2. Criar o projeto Supabase de produção
3. Rodar o SQL das tabelas `profiles` e `weddings`
4. Configurar o DNS

Tudo isso pode ser feito em uma tarde, pelo celular,
sem abrir o Cursor.