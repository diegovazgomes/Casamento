# Guia Rapido: Como Criar um Novo Tema

Este guia explica como criar um novo tema no projeto e quais arquivos precisam ser alterados.

## Objetivo

- Criar um novo arquivo de tema em `assets/config/themes/`
- Fazer o tema aparecer no editor
- Garantir que overrides de cor/tipografia fiquem isolados por tema
- Evitar sobrescrever outros temas

---

## 1. Duplicar um tema existente

1. Escolha um tema base, por exemplo:
   - `assets/config/themes/classic-gold-light.json`
2. Duplique e renomeie, por exemplo:
   - `assets/config/themes/classic-rose-light.json`

Dica: mantenha nomes curtos e sem espacos.

---

## 2. Atualizar metadados do novo tema

No novo arquivo de tema, ajuste o bloco `meta`:

```json
"meta": {
  "name": "Classic Rose Light",
  "description": "Tema claro com acentos rosados"
}
```

---

## 3. Registrar o tema no site.json

Abra `assets/config/site.json` e inclua o caminho no array `themeFiles`:

```json
"themeFiles": [
  "assets/config/themes/classic-gold.json",
  "assets/config/themes/classic-gold-light.json",
  "assets/config/themes/classic-silver.json",
  "assets/config/themes/classic-silver-light.json",
  "assets/config/themes/classic-purple.json",
  "assets/config/themes/classic-rose-light.json"
]
```

Se quiser que ele seja o tema inicial, ajuste `activeTheme`:

```json
"activeTheme": "assets/config/themes/classic-rose-light.json"
```

---

## 4. Entender como o isolamento por tema funciona

O projeto usa `themeOverridesByTheme` no `site.json`.

A chave do bucket e derivada automaticamente do nome do arquivo do tema (sem `.json`).

Exemplo:
- Arquivo: `assets/config/themes/classic-rose-light.json`
- Chave: `classic-rose-light`

Estrutura esperada:

```json
"themeOverridesByTheme": {
  "classic-rose-light": {
    "colors": {},
    "typography": {}
  }
}
```

Importante:
- Editar cores/fontes no editor com o tema A selecionado altera apenas `themeOverridesByTheme.<temaA>`
- Ao trocar para tema B, o editor passa a usar `themeOverridesByTheme.<temaB>`
- Nao ha sobrescrita cruzada entre temas

---

## 5. Quando mexer no editor.js

Normalmente, para criar um tema novo, voce NAO precisa alterar JS.

O editor ja carrega temas dinamicamente a partir de `themeFiles`.

Voce so precisa alterar `assets/js/editor.js` em casos especiais:

### 5.1 Adicionar novo campo de cor ao editor

Editar constante:
- `THEME_COLOR_SECTIONS`

Arquivo:
- `assets/js/editor.js`

### 5.2 Adicionar novo token que o CSS ainda nao usa

Se criar um token novo no JSON do tema (ex.: `colors.brandAccent`), tambem precisa:

1. mapear token em `assets/js/script.js` (funcao `applyTheme()`)
2. usar a CSS variable correspondente no CSS (`assets/css/style.css`)

Sem isso, o token novo nao tera efeito visual.

---

## 6. Quando mexer no schema

### 6.1 Schema do tema

Se o novo tema apenas usa os mesmos campos existentes, nao precisa alterar schema.

Se adicionar novas propriedades de tema, atualizar:
- `assets/config/schemas/theme-schema.json`

### 6.2 Schema do site

Se criar nova estrutura em `site.json`, atualizar:
- `assets/config/schemas/site-schema.json`

---

## 7. Checklist final (obrigatorio)

1. Abrir `editor.html`
2. Confirmar que o novo tema aparece nos cards
3. Selecionar o tema e alterar uma cor
4. Exportar `site.json`
5. Reimportar no editor e verificar persistencia
6. Trocar para outro tema e confirmar que nao herdou override indevido
7. Rodar testes:

```bash
npm test
```

---

## 8. Troubleshooting rapido

### Tema novo nao aparece no editor

- Verifique se entrou em `site.json.themeFiles`
- Verifique se o caminho esta correto
- Verifique se o JSON do tema e valido

### Cor alterada nao muda no site

- Verifique se o token existe em `applyTheme()` em `assets/js/script.js`
- Verifique se o CSS usa a variavel correspondente
- Verifique se alterou o tema certo no editor antes de editar o override

### Override vazando para outro tema

- Verifique se o valor foi salvo em `themeOverridesByTheme` com a chave correta
- A chave deve ser o nome do arquivo sem `.json`

---

## 9. Regra de ouro

Criar tema novo deve exigir apenas:

1. novo arquivo em `assets/config/themes/`
2. registro em `site.json.themeFiles`

Todo o resto so e necessario se voce adicionar novos tokens ou novas regras de layout.
