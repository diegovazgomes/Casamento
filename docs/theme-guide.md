# Guia de temas e layouts

## Visao geral

O projeto separa visual em duas camadas:

- `assets/layouts/{layout}/`
- `assets/themes/{theme}.json`

### Layout

Cada layout tem:

- `layout.css`
- `defaults.json`

O layout define:

- tipografia
- espacamentos
- estrutura
- componentes
- radius
- animacao
- responsivo

### Tema

Cada tema em `assets/themes/` define apenas:

- `meta`
- `colors`
- `effects`

O tema define:

- paleta de cores
- sombras
- glow
- gradientes
- superficies visuais derivadas da paleta

## Fluxo em runtime

1. ler `activeLayout` e `activeTheme` do `site.json`
2. carregar `assets/layouts/{layout}/layout.css`
3. carregar `assets/layouts/{layout}/defaults.json`
4. resolver o tema para `assets/themes/{theme}.json`
5. aplicar merge nesta ordem:
   - defaults do sistema
   - defaults do layout
   - tema compartilhado
   - overrides do `site.json`

## Como trocar de tema

Em `assets/config/site.json`:

```json
{
  "activeTheme": "gold"
}
```

Temas disponiveis hoje:

- `gold`
- `gold-light`
- `silver`
- `silver-light`
- `purple`
- `blue`
- `green-light`

## Overrides por tema

Overrides continuam em `themeOverridesByTheme`.

Exemplo:

```json
{
  "activeTheme": "gold-light",
  "themeOverridesByTheme": {
    "gold-light": {
      "colors": {
        "primary": "#d4af37"
      }
    }
  }
}
```

Compatibilidade legada:

- buckets antigos como `classic-gold` e `classic-purple` ainda podem ser lidos
- novas edicoes devem convergir para as chaves canonicas como `gold` e `purple`

## Como criar um novo tema

1. duplique um arquivo em `assets/themes/`
2. ajuste `meta`, `colors` e `effects`
3. use a chave nova em `site.json.activeTheme`

Exemplo:

- arquivo: `assets/themes/rose-light.json`
- chave: `"rose-light"`

## Estrutura esperada de um tema

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

## Regra de ouro

- layout define forma e tipografia
- tema define cor e atmosfera
- um mesmo tema deve funcionar em qualquer layout
