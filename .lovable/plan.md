

## Atualizar Logo da Orion na Capa da Proposta

### O que sera feito
Substituir o SVG atual da logo (que e um diamante/gem simples) pelo design correto da Orion: um circulo externo com uma elipse/oval interna, conectados por linhas geometricas diagonais formando um padrao de constelacao, com pontos (circulos) nas intersecoes. Tudo na cor cyan claro `#22d3ee` (mais claro que o `#06b6d4` atual, seguindo a paleta da marca).

### Alteracao

**Arquivo: `src/pages/ProposalGenerator.tsx` (linhas 393-415)**

Substituir o SVG atual por um novo SVG que reproduz fielmente o design da imagem:
- Circulo externo grande
- Elipse/oval interna centralizada
- Linhas geometricas diagonais conectando o circulo externo a elipse interna, formando facetas tipo diamante/constelacao
- Pontos (circulos pequenos) nas intersecoes das linhas com o circulo externo
- Cor: `#22d3ee` (cyan mais claro da paleta)
- Sem fundo (transparente)

Nenhuma outra alteracao sera feita no componente.
