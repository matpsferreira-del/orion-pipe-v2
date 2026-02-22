

## Remover fundo da logo Orion na capa da proposta

### Problema
A imagem `orion-logo.png` possui um fundo solido (branco ou colorido) que nao combina com o fundo escuro do slide (`#020617`). Precisamos que a logo apareca sem fundo, integrada ao slide.

### Solucao
Substituir a tag `<img>` por um SVG inline que reproduz fielmente o design da logo Orion (da imagem fornecida pelo usuario: circulo externo, oval interna, linhas geometricas diagonais e pontos nas intersecoes). O SVG tera fundo transparente por natureza, entao a logo vai se integrar perfeitamente ao fundo escuro do slide.

A cor sera `#22d3ee` (cyan claro da paleta da marca), consistente com o que foi definido anteriormente.

### Detalhes tecnicos
- **Arquivo**: `src/pages/ProposalGenerator.tsx`, linha 394
- Substituir `<img src={orionLogo} .../>` por um `<svg>` inline com o design correto da logo
- O SVG tera `fill="none"` e `stroke="#22d3ee"` para garantir fundo transparente
- Manter as mesmas dimensoes (90x90)
- Nenhuma outra alteracao no componente

