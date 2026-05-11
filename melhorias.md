# Melhorias
## Bride/Groom
[x] - Adicionar dois novos campos de texto no signup.html (bride_name e groom_name)
[x] - Atualizar API `/api/auth/signup.js` para persistir bride_name e groom_name
[x] - Remover campos bride_name/groom_name do wizard etapa 1, manter apenas "Como aparecem no convite"
[x] - Adicionar campos bride_name e groom_name no editor do evento (aba Editar Evento)
[x] - Persistir alterações de bride_name e groom_name na API

## Layout Mobile

[x] - Corrigir grid do wizard etapa 2 para mobile (data e horário devem ficar 100% width em mobile)
[x] - Atualizar placeholder do endereço para "Av. Rainha Simone, 1971"

## Temas Free

[x] - Filtrar temas no wizard etapa 3: exibir apenas classic-gold, classic-silver, classic-gold-light, classic-silver-light
[x] - Adicionar banner: "Esses são os temas do plano free. Upgrade para acessar mais temas"

## Prévia do Convite

[x] - Remover risco/linha que passa sobre a data na prévia
[x] - Remover quadriculado de fundo em temas light

## Mensagens (Convite Criado!)

[x] - Mensagem 01: trocar "menu lateral" por "aba Editar Evento"
[x] - Mensagem 02: trocar "No topo do painel" por "na aba Editar Evento"
[x] - Mensagem 03: atualizar para mencionar "aba Convites" e "convite individual personalizado"

## Dashboard

[x] - Mover "Editar Evento" para segunda posição na sidebar (após Visão Geral)

## Próximas Melhorias (Execução + Testes)

### 1) Cadastro: corrigir autofill (web + mobile)

[x] - Reproduzir e documentar o bug de autofill em `signup.html` (email, telefone, senha e demais campos afetados)
[x] - Corrigir estilo de `autofill` para manter identidade visual (evitar campo branco após preenchimento automático)
[x] - Corrigir sincronização de valor/validação para aceitar envio sem precisar apagar e digitar novamente
[x] - Validar comportamento em navegadores mobile e desktop (Chrome/Edge/Safari quando aplicável)
[x] - Adicionar teste de regressão (manual guiado e automatizado se viável)

### 2) Mobile: aumentar tipografia proporcionalmente

[x] - Mapear escalas tipográficas atuais no mobile (base, títulos, labels, botões e helpers)
[x] - Definir nova escala proporcional mantendo legibilidade e sofisticação visual
[x] - Aplicar ajustes globais de fonte/tamanho/line-height para mobile sem quebrar layout
[x] - Revisar telas principais no celular (`landing`, `signup`, `dashboard`, `editor`)
[x] - Executar checklist visual de regressão (overflow, cortes de texto e hierarquia)

### 3) Editar Evento: reforçar estado de alterações não salvas por seção

[x] - Adicionar bloco de aviso no fim de cada seção da aba Editar Evento (`Aparências`, `Página de presentes`, `Confirmação`, etc.)
[x] - Exibir mensagem destacada de "Alterações não salvas" quando houver mudanças pendentes
[x] - Incluir botão de salvar no rodapé de cada seção (mesma ação do botão salvar do topo)
[x] - Após salvar com sucesso, exibir confirmação verde equivalente ao feedback do topo
[x] - Testar fluxo completo no mobile (editar -> aviso pendente -> salvar no rodapé -> confirmação)

### 4) Upload de fotos: UX de envio e pós-envio

[x] - Melhorar instruções visuais da área de upload (hero e galeria) antes do envio
[x] - Adicionar estado de carregamento com feedback claro (ex.: barra/progresso ou status "carregando")
[x] - Exibir confirmação explícita após upload concluído com orientação para salvar alterações
[x] - Tratar estados de erro (falha de upload, arquivo inválido, limite excedido) com mensagens claras
[x] - Validar jornada completa em mobile: selecionar foto -> upload -> confirmação -> salvar

### Sequência sugerida de entrega

[ ] - Entrega A: item 1 (autofill) + testes de regressão
[ ] - Entrega B: item 2 (tipografia mobile) + revisão visual completa
[ ] - Entrega C: item 3 (avisos/save por seção) + testes de UX no editor
[ ] - Entrega D: item 4 (upload de fotos) + testes ponta a ponta no mobile


Quando tentamos criar conta com email existente, ele não informa que esse email já esta cadastrado

---

## Avaliação e Plano de Melhoria — Aba Editar Evento

### Pontos fortes

| # | Ponto | Por quê funciona |
|---|-------|-----------------|
| 1 | Barra sticky de save com estados coloridos | Status "Alterações não salvas" em âmbar e "Configurações salvas ✓" em verde dá feedback imediato sem bloquear o fluxo |
| 2 | Auto-geração de formatos de data | Alterar um só campo `date` preenche automaticamente heroDate, displayDate e weekday — elimina erro humano |
| 3 | Auto-extração de coordenadas do Maps | Cole o link, as coordenadas aparecem — resolve um ponto técnico sem expor o usuário |
| 4 | Seções colapsáveis | Permite focar no que importa e reduzir a sobrecarga cognitiva |
| 5 | Toggle switches claros | Habilitar/desabilitar Pix, cartão, catálogo, galeria, mapa em um clique |
| 6 | Preview ao vivo de mídia | Foto do hero e QR Pix aparecem logo após upload, sem precisar salvar antes |
| 7 | Confirmação de descarte | Não deixa o usuário perder trabalho acidentalmente ao clicar "Descartar" |
| 8 | Reflexo imediato no dashboard pós-save | `applySiteConfig()` atualiza o state local, sem precisar recarregar a página |
| 9 | Catálogos pré-definidos por categoria | Usuário escolhe "Lua de mel" e já tem 12 itens prontos — reduz trabalho de criação |
| 10 | FAQ com add/remove e auto-focus | Adicionar uma pergunta já posiciona o cursor no campo novo — boa microinteração |

### Pontos de melhoria

| # | Problema | Impacto no usuário |
|---|----------|--------------------|
| 1 | Todas as seções abertas por padrão | A página tem centenas de pixels de altura, o usuário precisa rolar muito para encontrar o que quer editar |
| 2 | Sem validação antes do save | Clicar "Salvar alterações" com telefone inválido ou campo vazio só gera erro do servidor — nenhum campo fica destacado |
| 3 | Mudança de tema sem preview | O hint diz "recarregue o convite para ver a mudança" — o usuário não consegue comparar temas antes de salvar |
| 4 | Upload desacoplado do save | Após enviar uma foto aparece "Lembre-se de salvar", mas é fácil fechar a aba sem salvar |
| 5 | Confirmação de descarte usa `confirm()` nativo | O dialog padrão do navegador quebra o design visual e não oferece contexto do que será descartado |
| 6 | Galeria sem delete ou reordenação | Uma foto enviada não pode ser removida ou reposicionada no editor |
| 7 | Nossa História limitada a 3 capítulos | Campos hardcoded — casais com mais momentos importantes ficam sem opção |
| 8 | Campos de áudio técnicos demais | "Volume (0–1)" e "Início (seg)" deveriam ser slider e formato MM:SS |
| 9 | Tag "Assets" na seção de Fotos | Terminologia técnica pouco intuitiva para o usuário final |
| 10 | Sem indicador de completude por seção | Não há sinal visual de quais seções têm campos obrigatórios preenchidos |
| 11 | Dot do status não pulsa no estado dirty | O usuário pode não notar que há alterações não salvas ao rolar a página |
| 12 | Sem "Salvar e visualizar" combinado | Para ver o resultado: salvar → clicar "Ver convite" → esperar o convite carregar — três ações separadas |

### Plano de melhorias

#### Fase A — Polimento imediato *(baixo esforço, alto impacto visual)*

[ ] - Recolher seções por padrão no carregamento — abrir somente a seção 1 (Casal & Evento) automaticamente
[ ] - Renomear tag "Assets" → "Fotos & Mídia" na seção 5
[ ] - Pulsação do dot no estado dirty — `@keyframes pulse` ativada pela classe `.is-dirty .editor-save-dot`
[ ] - Botão "Salvar e visualizar" — combina save + abertura do convite em nova aba quando há alterações pendentes

#### Fase B — Validação e feedback *(médio esforço, elimina erros silenciosos)*

[ ] - Validação inline antes do save — checar campos obrigatórios e URLs, destacar o campo inválido com borda vermelha e rolar até ele
[ ] - Modal de confirmação customizado para "Descartar" — substituir `confirm()` nativo por modal com design do dashboard
[ ] - Indicador de completude por seção — ícone de check verde / ponto âmbar no header de cada seção colapsada

#### Fase C — Upload e galeria *(médio esforço, elimina frustração com mídia)*

[ ] - Delete de fotos da galeria — botão de remoção em cada card, atualizando o config local e marcando dirty
[ ] - Reordenação da galeria por drag-and-drop — usando Drag and Drop API nativa, sem dependências externas
[ ] - Badge "não salvo" no header da seção Fotos após upload, removido após save

#### Fase D — Conteúdo e usabilidade avançada *(maior esforço, amplia capacidade)*

[ ] - Capítulos dinâmicos em Nossa História — transformar os 3 campos fixos em lista dinâmica igual ao FAQ
[ ] - Sliders para volume de áudio e timepicker para início (MM:SS) — substituir os inputs numéricos técnicos
[ ] - Miniaturas de tema no seletor — swatch de cores (primária + fundo + destaque) ao lado de cada opção

#### Sequência sugerida

[ ] - Fase A → Fase B → Fase C → Fase D (A e B podem rodar em paralelo)