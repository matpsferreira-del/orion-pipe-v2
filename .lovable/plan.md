

## Tornar o nome da empresa editavel diretamente na capa do slide

### Situacao atual
A capa da proposta ja esta fiel ao PDF: logo SVG, "ORION Recruitment", "Seu sucesso e o nosso sucesso.", e a secao "Proposta Comercial Exclusiva para: {empresa}". O nome da empresa vem do estado `empresa` (preenchido automaticamente pelo nome fantasia da empresa vinculada a oportunidade).

Porem, o nome da empresa e exibido como texto estatico no slide. O usuario quer poder editar o nome diretamente no slide.

### Solucao
Substituir o `<p>` que exibe `{empresa}` (linha 453) por um `<input>` estilizado para parecer texto normal do slide (sem borda visivel, fundo transparente), mas que permite edicao direta clicando no texto. O input tera:

- Fundo transparente
- Sem borda (so aparece ao focar/hover com um leve outline cyan)
- Mesma cor, tamanho e peso de fonte do texto atual (`#06b6d4`, `28px`, `fontWeight: 700`)
- Texto centralizado
- `value={empresa}` e `onChange` ligado ao `setEmpresa`

Tambem remover a condicao `{empresa &&` para que a secao sempre apareca (mesmo sem empresa preenchida), permitindo que o usuario digite o nome manualmente.

### Detalhes tecnicos
- **Arquivo**: `src/pages/ProposalGenerator.tsx`
- **Linhas 450-455**: Remover condicional `{empresa &&`, manter o `div` sempre visivel
- **Linha 453**: Trocar `<p>` por `<input>` com estilos inline para transparencia e consistencia visual
- Placeholder: "Nome da Empresa"
- Nenhuma outra alteracao no componente
