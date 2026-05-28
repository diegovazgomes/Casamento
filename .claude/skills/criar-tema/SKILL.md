---
name: criar-tema
description: Cria um novo tema visual compartilhado em assets/themes/ para ser reutilizado por qualquer layout.
---

# Skill: Criar Novo Tema

Cria uma nova paleta compartilhada do projeto em `assets/themes/{nome}.json`.

## Objetivo

Tema define apenas:

- `meta`
- `colors`
- `effects`

Nao colocar no tema:

- tipografia
- spacing
- layout
- components
- radius
- animation

Esses itens pertencem ao `defaults.json` de cada layout.

## Fluxo obrigatorio

### 1. Pedir referencia

Peca ao usuario uma descricao visual ou imagem com foco em:

- clima cromatico
- contraste
- acabamento
- sensacao geral

### 2. Extrair tokens

Defina:

- nome sugerido da paleta
- fundo
- superficie
- destaque principal
- destaque suave
- texto principal
- texto secundario
- bordas
- gradientes e sombras coerentes

### 3. Confirmar antes de gerar

Pergunte:

1. nome/slug do tema
2. direcao aprovada da paleta

### 4. Gerar arquivo

Criar:

- `assets/themes/{slug}.json`

Estrutura:

```json
{
  "meta": {
    "name": "Rose Light",
    "description": "Tema claro com acentos rosados"
  },
  "colors": {},
  "effects": {}
}
```

### 5. Ativacao

O fluxo novo nao usa `site.json.themeFiles`.

Para ativar o tema:

```json
{
  "activeTheme": "{slug}"
}
```

## Quando mexer no JS

So altere JS se criar um token novo que ainda nao exista no sistema.

Nesse caso:

1. mapear em `assets/js/script.js`
2. garantir uso da CSS variable correspondente
3. revisar `assets/js/editor.js` se o token precisar aparecer no editor

## Checklist final

1. Abrir `editor.html`
2. Confirmar que a paleta aparece nos cards
3. Selecionar o tema
4. Exportar e reimportar `site.json`
5. Validar visual na home e em uma pagina extra
6. Rodar testes quando a alteracao impactar runtime
