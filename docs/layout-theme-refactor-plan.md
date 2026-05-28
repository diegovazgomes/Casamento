# Plano de Refatoracao de Layouts e Temas

## Objetivo

Consolidar a arquitetura visual para que:

- `layout` seja responsavel por tipografia, espacamentos, estrutura e comportamento visual
- `theme` seja responsavel apenas por paleta de cores e efeitos visuais derivados da paleta
- todos os layouts consumam a mesma fonte compartilhada de temas em `assets/themes/*.json`

## Problema atual

- o projeto ainda aceita formatos legados de tema como `classic-gold`, `black-silver` e caminhos antigos
- existem buckets de `themeOverridesByTheme` com nomes legados
- runtime, editor e dashboard ainda carregam ou reconhecem multiplas convencoes ao mesmo tempo

## Direcao desejada

### Layout

Arquivos:

- `assets/layouts/{layout}/layout.css`
- `assets/layouts/{layout}/defaults.json`

Responsabilidades:

- `typography`
- `spacing`
- `layout`
- `components`
- `radius`
- `animation`
- `responsive`

### Theme

Arquivos:

- `assets/themes/{theme}.json`

Responsabilidades:

- `colors`
- `effects`

## Estrategia

### Fase 1 - Normalizacao de tema

- criar helper unico para normalizar selecoes legadas de tema
- mapear chaves antigas para paletas compartilhadas
- fazer runtime, editor e dashboard consumirem o mesmo comportamento

### Fase 2 - Overrides por tema

- manter leitura de buckets antigos de `themeOverridesByTheme`
- priorizar escrita no bucket canonico novo
- permitir migracao gradual sem quebrar configs antigas

### Fase 3 - Consolidacao operacional

- manter o fluxo principal em `assets/themes/*.json`
- deixar temas por layout apenas como legado temporario, sem uso pelo fluxo principal
- atualizar testes para refletir o modelo novo

## Escopo desta implementacao

Esta refatoracao de teste vai:

- documentar a arquitetura alvo
- normalizar resolucao de tema para paletas compartilhadas
- consolidar leitura de overrides antigos e novos
- migrar o editor para gravar buckets canonicos de tema
- alinhar testes do runtime e dashboard ao modelo novo

## Fora de escopo nesta etapa

- remover todos os arquivos legados restantes em `assets/layouts/*/themes`
- reescrever skills do Claude/Codex
- atualizar toda a documentacao antiga do projeto
- revisar schema de `activeLayout` versus `minimal`

## Resultado esperado

- trocar uma paleta passa a exigir alteracao de um unico arquivo em `assets/themes/`
- layouts continuam responsaveis pela tipografia
- configs antigas continuam funcionando
- novas edicoes passam a convergir para buckets de override canonicos
