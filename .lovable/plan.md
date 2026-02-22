

## Corrigir Capa da Proposta e Exportacao PDF

### Problema 1: Nome do cliente ausente na capa
O slide 1 (capa) nao exibe o nome da empresa. Precisa adicionar "Proposta Comercial Exclusiva para:" seguido do nome do cliente abaixo do slogan.

### Problema 2: PDF exportando paginas em branco
A funcao `handleExportPDF` clona os slides e usa `html-to-image` (`toPng`), mas:
- O clone perde os estilos do `<style>` tag (pseudo-elementos `::before` para o grid de fundo)
- O clone perde estilos computados das classes CSS definidas na tag `<style>`
- Resultado: paginas completamente escuras/vazias no PDF

### Solucao

**Arquivo: `src/pages/ProposalGenerator.tsx`**

**1. Adicionar nome do cliente na capa (Slide 1, linhas 340-341)**

Inserir apos o slogan "Seu sucesso e o nosso sucesso.":
```text
Proposta Comercial Exclusiva para:
{empresa}
```
Com estilo consistente (texto slate-400 para o label, texto branco/cyan bold para o nome).

**2. Corrigir exportacao PDF**

Substituir a abordagem de clone + `toPng` por captura direta dos slides originais (sem clonar). O problema e que o clone perde todos os estilos injetados via `<style>`. A solucao:

- Capturar cada slide **diretamente** (sem clone) usando `toPng` no elemento original
- Antes da captura, temporariamente remover `border-radius`, `box-shadow` e `border` via style inline
- Restaurar apos a captura
- Isso garante que os pseudo-elementos `::before` (grid background) e todos os estilos CSS da tag `<style>` sejam preservados

Alternativamente, se o pseudo-elemento continuar problematico, converter o `::before` do grid para uma `<div>` real com os mesmos estilos inline (assim funciona tanto no preview quanto na captura). Esta e a abordagem mais robusta.

**Resumo das alteracoes:**

| Local | Mudanca |
|-------|---------|
| Slide 1 (linhas 340-341) | Adicionar "Proposta Comercial Exclusiva para: {empresa}" |
| CSS `proposal-slide::before` | Converter para div real com estilos inline dentro de cada slide |
| `handleExportPDF` (linhas 121-175) | Capturar slides originais sem clonar, removendo border-radius/shadow temporariamente |

