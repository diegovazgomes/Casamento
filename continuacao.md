# Continuação — Dashboard (21/04/2026)

## O que foi feito neste chat

### 1. Análise de bugs do dashboard (planejamento)

Identificados 10 bugs no dashboard após a fase anterior de restauração:

- Total de convidados sobrescrito pelo número de respostas
- `state.confirmacoes` era a lista filtrada, tornando os KPIs do overview errados quando filtro estava ativo
- Tabelas cortadas (`overflow:hidden` no `.table-wrap`)
- `position:relative` ausente no `.table-wrap`, quebrando o pseudo-elemento `::before`
- Paginação da carga anterior visível durante novo spinner
- Sem debounce no campo de busca (múltiplas requisições por burst)
- Stats atualizadas 3x com flicker durante `loadAllData()`
- Botão "Novo grupo" visível em todas as abas no mobile
- Espaço grande no desktop (spinner com `padding:56px`)
- Sidebar mobile inutilizável (nome do casal escondido, só ficava "Dashboard")

---

### 2. Correções implementadas em `assets/js/dashboard.js`

**Estado:**
- Adicionado `state.allConfirmacoes: []` — armazena o resultado bruto da API sem filtros
- `state.confirmacoes` passou a ser apenas a lista exibida na tabela (pode ser filtrada)

**Cálculo correto do total:**
- `updateOverview()` agora usa `state.allConfirmacoes` para confirmados/recusados/pendentes
- Total de convidados = `sum(grupo.max_confirmations)`, nunca `confirmacoes.length`
- `loadRelatorios()` não chama mais `updateOverviewStats()` — essa responsabilidade é exclusiva de `updateOverview()`

**Paginação:**
- `paginacao.innerHTML = ''` limpa o container no início de cada `loadConfirmacoes()`

**Debounce na busca:**
- Adicionada função `debounce(fn, delay)`
- `filterSearch` usa `addEventListener('input', debounce(reloadConfirmacoes, 350))`
- `oninput` inline removido do HTML

**Visibilidade do botão "Novo grupo":**
- Adicionada `syncTabActions(tabName)` — oculta `#btnNewGroup` fora da aba `grupos`
- Chamada em `handleTabSwitch()` e `syncActiveTab()`

**Carregamento paralelo:**
- `loadAllData()` usa `Promise.all([loadGrupos(), reloadConfirmacoes()])` — reduz tempo à metade
- `populateGrupoFilter()` roda depois (depende de `state.grupos`)
- `loadRelatorios()` roda em background sem bloquear o overview

**Copiar link de convite:**
- Adicionada `copyInviteLink(token)` — copia `origin/index.html?g=TOKEN` para a área de transferência
- Fallback legado via `execCommand` para ambientes sem `clipboard API`
- Adicionada `showCopyFeedback(token)` — muda ícone para ✓ verde por 2 segundos
- Botão de copiar adicionado como primeiro ícone na coluna de Ações da tabela de grupos (antes de editar)

---

### 3. Correções implementadas em `dashboard.html` (CSS)

**Tabelas:**
- `.table-wrap`: `overflow:hidden` → `overflow-x:auto`
- `.table-wrap`: adicionado `position:relative` (corrige posicionamento do `::before`)

**Desktop — espaço grande:**
- `.empty`: `padding:56px` → `padding:32px`
- `.loading`: `padding:56px` → `padding:32px`

**Mobile — sidebar:**
- `@media (max-width:560px)`: `.sidebar-brand-label` (texto "DASHBOARD") fica oculto
- `.sidebar-brand-names` passa a exibir com `font-size:13px` — mostra o nome do casal vindo do `site.json`
- `.sidebar-brand-date` permanece oculto

---

## Estado atual dos arquivos principais

| Arquivo | Estado |
|---|---|
| `assets/js/dashboard.js` | Corrigido — sem erros |
| `dashboard.html` | Corrigido — sem erros |
| `assets/js/dashboard-theme-config.js` | Sem alterações neste chat |
| `test-dashboard-simple.ps1` | Passou 17/17 (100%) |

---

## O que falta fazer (próximo chat)

### Funcionalidades ainda pendentes

1. **Copiar link — exibir o link na interface**
   - Considerar mostrar o link completo na linha da tabela ou em tooltip, além de copiar
   - Hoje só copia silenciosamente com feedback visual no botão

2. **Alerta após criar grupo**
   - `handleSaveGrupo()` usa `alert()` nativo com o link — substituir por feedback inline no estilo do dashboard

3. **Testes de smoke — atualizar verificações**
   - `test-dashboard-simple.ps1` ainda verifica `updateOverview` mas não `copyInviteLink` nem `showCopyFeedback`
   - Considerar adicionar essas funções à lista de verificação

4. **Validação manual no navegador (com API real)**
   - Login/logout
   - Criar grupo → confirmar que botão de copiar link aparece e funciona
   - Filtrar por nome → verificar que KPIs do overview não mudam
   - Criar grupo com 5 vagas, 2 confirmações → Total deve mostrar 5, Confirmados 2

5. **Deploy para Vercel**
   - Configurar `.env.local` com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `DASHBOARD_PASSWORD`
   - Push e verificar no ambiente real

---

## Arquitetura para referência rápida

- `dashboard.html` — layout, CSS inline, modais, loader de tema via `<script type="module">`
- `assets/js/dashboard.js` — toda a lógica (carregado como script clássico, funções globais)
- `assets/js/dashboard-theme-config.js` — bootstrap de tema/config (importado pelo loader inline)
- `api/dashboard/guest-groups.js` — CRUD de grupos, link = `origin/index.html?g={token}`
- `api/dashboard/confirmations.js` — listagem, filtros, paginação, export CSV
- `api/dashboard/auth.js` — autenticação por senha via JWT simples
- `api/dashboard/reminders.js` — envio de lembrete via WhatsApp
