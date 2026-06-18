# Plano de melhorias do tema minimal

Este documento consolida os problemas encontrados no layout `minimal` e organiza a ordem recomendada de correção. O foco é corrigir inconsistências visuais e funcionais sem alterar conteúdo hardcoded fora do `site.json`.

## Escopo

- Tema/layout alvo: `assets/layouts/minimal/`.
- Páginas principais afetadas: `historia.html`, `faq.html`, `mensagem.html`, `musica.html`.
- Ajuste adicional fora do layout: comportamento do áudio ao navegar entre páginas.

## Prioridade 1 - Bugs funcionais

### 1. Galeria da página Nossa História não navega visualmente

Sintoma:
- Ao clicar nas setas ou dots, a foto não parece passar para a próxima.
- No desktop, a imagem da galeria fica grande demais em relação à tela.

Causa provável:
- O JavaScript troca a classe `.active` nos slides, mas o CSS do `minimal` usa a galeria como trilho flexível (`display: flex`) sem aplicar `transform`.
- O CSS do `minimal` estiliza `.gallery-dot.is-active`, mas o JavaScript usa `.gallery-dot.active`.

Plano:
- Alinhar o CSS do `minimal` ao comportamento compartilhado de `gallery.js`, usando slides absolutos e exibindo apenas `.gallery-slide.active`, como nos layouts `classic` e `modern`.
- Trocar `.gallery-dot.is-active` para `.gallery-dot.active`.
- Definir largura máxima visual para a galeria no desktop, evitando que ela ocupe uma altura excessiva.
- Manter proporção retrato controlada no mobile, sem quebrar o swipe.

Critérios de aceite:
- Setas, dots, teclado e swipe trocam a foto visualmente.
- Dot ativo acompanha a foto atual.
- Galeria fica proporcional no desktop e no mobile 375px.

### 2. FAQ não mostra respostas

Sintoma:
- A página exibe apenas as perguntas.
- As respostas permanecem ocultas.

Causa provável:
- O CSS espera `.faq-item.is-open` para expandir a resposta.
- O módulo `assets/js/faq.js` não cria botão interativo nem evento de clique.

Plano:
- Renderizar cada pergunta como `<button>` com `aria-expanded`.
- Alternar `.is-open` no item ao clicar.
- Garantir navegação por teclado e foco visível.
- Manter textos vindos de `site.json`.

Critérios de aceite:
- Clicar na pergunta abre e fecha a resposta.
- Resposta aparece em desktop e mobile.
- Estado acessível via `aria-expanded`.

## Prioridade 2 - Layout das páginas extras

### 3. Nossa História quebra no desktop

Sintoma:
- Conforme print enviado, a timeline fica desalinhada.
- O texto do capítulo fica estreito demais, quebrando em muitas linhas.
- O título do capítulo fica distante do texto e a composição parece vazia.

Causa provável:
- `.historia-chapter` usa grid com coluna fixa pequena para o ano e joga título/texto em posições que não favorecem leitura no desktop.
- O texto herda largura e alinhamento que deixam a coluna muito curta no layout minimal.

Plano:
- Reestruturar `.historia-chapter` no desktop com áreas explícitas para ano, título e texto.
- Garantir largura legível para o texto do capítulo.
- Reduzir vazios horizontais e aproximar título/texto.
- Manter uma coluna simples no mobile.

Critérios de aceite:
- Capítulos ficam legíveis no desktop, sem texto em coluna estreita.
- Mobile mantém leitura vertical natural.

### 4. Padding e alinhamento das páginas extras

Sintoma:
- As páginas extras parecem muito afastadas do topo.
- O primeiro bloco soma espaçamentos e cria uma hierarquia visual estranha.

Causa provável:
- `main.extra-main` tem `padding-top`.
- A primeira seção também é `.content-section.extra-intro`, que recebe outro padding.
- No `minimal`, o responsive mobile usa `sectionPaddingTop: 72px`, maior que o padrão recomendado para mobile.

Plano:
- Ajustar o padding do primeiro bloco de páginas extras no `minimal`.
- Reduzir `sectionPaddingTop` mobile do layout minimal para o padrão do projeto.
- Revisar `extra-intro`, `extra-content` e `gift-back-wrap` para espaçamento consistente.

Critérios de aceite:
- Extras abrem com respiro premium, mas sem excesso de topo.
- Mobile 375px não parece espremido nem distante demais.

## Prioridade 3 - Formulários de Mensagem e Música

### 5. Mensagem ao casal está visualmente ruim no desktop e mobile

Sintoma:
- No desktop, o formulário fica muito largo e pouco hierarquizado.
- No mobile, não fica claro onde começa a caixa de texto.
- Há diferença incômoda de tamanho entre campos e textos.

Causa provável:
- O `minimal` reaproveita `.rsvp-input` nos formulários extras, mas o estilo atual não diferencia bem input simples e textarea.
- `.extra-form-textarea` remove boa parte da aparência de campo, deixando a caixa pouco reconhecível.
- O formulário não tem largura máxima/ritmo visual próprio.

Plano:
- Criar tratamento específico no `minimal` para `.extra-form`, `.extra-form-card`, `.extra-form-field`, `.rsvp-input` dentro de páginas extras e `.extra-form-textarea`.
- Dar borda, fundo e altura mínima clara para textarea.
- Padronizar fontes, tamanhos e espaçamentos entre label, input e textarea.
- Limitar largura do formulário no desktop.
- Preservar foco acessível e estados de erro.

Critérios de aceite:
- Campo de texto e textarea ficam visualmente identificáveis.
- Desktop deixa de parecer um formulário esticado de ponta a ponta.
- Mobile 375px fica legível e com hierarquia clara.

### 6. Tela de música precisa do mesmo tratamento visual

Sintoma:
- Campos de observação não parecem caixa de texto.
- Desktop e mobile repetem os problemas visuais da tela de mensagem.

Causa provável:
- A tela de música usa a mesma base visual de formulário extra.

Plano:
- Aplicar o mesmo padrão visual criado para Mensagem ao Casal.
- Garantir que o textarea de observações tenha altura, borda e fundo perceptíveis.
- Revisar espaçamento entre campos para evitar blocos colados ou grandes demais.

Critérios de aceite:
- Campos obrigatórios e opcionais ficam claros.
- Textarea de observações é reconhecida imediatamente.

## Prioridade 4 - Áudio ao trocar de página

### 7. Ruído estranho quando a música para ao navegar

Sintoma:
- Com música tocando, ao ir para outra página ocorre um ruído ao parar o áudio.
- O problema não parece relacionado ao layout `minimal`.

Causa provável:
- O áudio pode estar sendo interrompido abruptamente durante unload/navegação.
- Pode haver transição de estado, pause ou troca de `src/currentTime` sem fade out.

Plano:
- Auditar `assets/js/audio.js` e pontos de navegação entre páginas.
- Implementar parada suave antes de navegação quando possível, usando fade out curto.
- Evitar reset brusco de `currentTime` durante `pagehide`/`beforeunload`.
- Garantir que a solução não atrase a navegação de forma perceptível.

Critérios de aceite:
- Navegar para página extra com áudio tocando não gera ruído.
- Pausar manualmente continua funcionando normalmente.
- Sem `console.log()` de debug.

## Prioridade 5 - Limpeza complementar

### 8. Hospedagem e links editáveis

Sintoma:
- Cards vazios de hospedagem podem aparecer quando existem itens sem nome/descrição/link.
- `linkLabel` existe no `site.json` e no editor, mas a página usa texto fixo.

Plano:
- Filtrar itens completamente vazios antes de renderizar.
- Usar `item.linkLabel` quando existir.
- Ajustar grid do `minimal` para nome, descrição e link não competirem na mesma linha.

Critérios de aceite:
- Itens vazios não aparecem.
- Label editado no editor aparece na página.

### 9. Cores hardcoded no minimal

Sintoma:
- Há cores diretas de erro no CSS do `minimal`.

Plano:
- Criar ou reutilizar variáveis de erro do tema.
- Substituir cores hardcoded por `var(...)`.

Critérios de aceite:
- Nenhuma cor nova hardcoded em estados de erro.

## Ordem recomendada de implementação

1. Corrigir FAQ e galeria.
2. Ajustar timeline de Nossa História e tamanho da galeria.
3. Corrigir espaçamentos das páginas extras.
4. Reformular visual dos formulários de Mensagem e Música.
5. Corrigir ruído do áudio na navegação.
6. Revisar hospedagem e limpeza de variáveis CSS.
7. Testar desktop e mobile 375px nas páginas afetadas.

## Verificações obrigatórias

- Testar `historia.html`, `faq.html`, `mensagem.html` e `musica.html` em desktop.
- Testar as mesmas páginas em viewport 375px.
- Conferir que todo texto exibido ao usuário continua vindo do `site.json`.
- Conferir foco visível em botões, links e campos.
- Conferir que não ficou `console.log()` de debug.
- Registrar no `melhorias.md` o que for efetivamente corrigido durante a implementação.
