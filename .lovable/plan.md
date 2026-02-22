

## Corrigir SVG da Logo Orion para Reproduzir Fielmente a Imagem

### Problema
O SVG atual tem apenas 4 linhas diagonais simples, resultando num design muito diferente da logo real. A imagem real mostra um padrao de facetas complexo (tipo corte de gema/diamante visto de cima) com muitas linhas conectando pontos do circulo externo a oval interna.

### Analise da imagem real
A logo real possui:
- **Circulo externo** (traço grosso, ~3px)
- **Oval/elipse interna** (traço grosso, ~3px)
- **~16 linhas** que conectam pontos no circulo externo a pontos na oval, criando facetas triangulares no espaço entre as duas formas (similar a um corte brilhante de diamante visto de cima)
- **~12 pontos** (circulos preenchidos) nas intersecoes onde as linhas encontram o circulo externo
- As linhas formam um padrao simetrico com facetas na parte superior (tipo "coroa" do diamante) e na parte inferior

### Solucao
Substituir o SVG atual (linhas 394-418) por um SVG muito mais detalhado que reproduz fielmente o padrao de facetas da logo, com:
- Tracos mais grossos (strokeWidth ~2.5-3) para corresponder ao visual da imagem
- Multiplas linhas formando triangulos/facetas entre o circulo e a oval
- Pontos posicionados corretamente nas intersecoes com o circulo externo
- Mesma cor `#22d3ee`

### Detalhes tecnicos
- **Arquivo**: `src/pages/ProposalGenerator.tsx`, linhas 394-418
- Substituir o SVG simplificado por um com ~16 linhas e ~12 pontos posicionados para criar o padrao de facetas correto
- Manter dimensoes 90x90 e viewBox 0 0 100 100
- Nenhuma outra alteracao no componente
