

## Gerador de Posts para LinkedIn - Componente React

Converter o HTML/Tailwind do gerador de imagens de vagas para LinkedIn num componente React integrado ao ATS, acessivel a partir do detalhe de cada vaga.

### O que sera criado

**1. Novo componente: `src/components/jobs/LinkedInPostGenerator.tsx`**
- Converter todo o HTML para JSX com classes Tailwind intactas
- Substituir `document.getElementById` por `useState` para cada campo (area, title, model, location, badge)
- Usar `useRef` para referenciar o elemento de captura
- Manter os estilos CSS inline e custom (glow orbs, grid background, preview scaling) via objetos de estilo React
- Pre-preencher campos automaticamente com dados da vaga recebida via props:
  - `title` → campo Cargo
  - `area` → campo Area (usando `jobAreaLabels` para traduzir)
  - `location` → campo Localizacao
- Manter a logica de clone off-screen para captura exata em 1080x1080px
- Usar `html-to-image` (mais leve e moderno que html2canvas) para gerar o PNG
- O SVG do logo Orion sera convertido para JSX inline

**2. Instalar dependencia: `html-to-image`**
- Alternativa moderna ao html2canvas, sem dependencias externas de CDN
- Funcao `toPng` para captura direta do elemento

**3. Novo Dialog wrapper: `src/components/jobs/LinkedInPostDialog.tsx`**
- Dialog/Sheet que envolve o gerador
- Recebe a `job: JobRow` como prop
- Acessivel via botao no `JobDetail.tsx`

**4. Integracao no `JobDetail.tsx`**
- Adicionar botao "Gerar Post LinkedIn" nas acoes da vaga (ao lado de "Editar")
- Abrir o dialog do gerador passando os dados da vaga

### Mapeamento de dados da vaga para os campos

```text
Job.title        → Campo "Cargo / Vaga"
Job.area         → Campo "Area de Atuacao" (traduzido via jobAreaLabels)
Job.location     → Campo "Localizacao Base"
"VAGA EM DESTAQUE" → Campo "Destaque Superior" (valor padrao)
""               → Campo "Modelo de Trabalho" (sem dado no banco, editavel manualmente)
```

### Fluxo do usuario

```text
Vagas → Clica numa vaga → Sheet de detalhe → Botao "Gerar Post" → Dialog com:
  - Painel esquerdo: formulario com campos pre-preenchidos (editaveis)
  - Painel direito: preview da arte 1080x1080 (escalada para caber na tela)
  - Botao "Transferir Imagem (PNG)" que faz download
```

### Detalhes tecnicos

- A funcao de download cria um clone off-screen do elemento de captura (exatamente como o original), renderiza com `html-to-image` no tamanho 1080x1080, gera um data URL PNG e faz download automatico
- O preview na tela usa `transform: scale(0.5)` com `transform-origin: top left` dentro de um container de 540x540, identico ao original
- Os estilos custom (pseudo-elementos `::before` para o grid, glow orbs) serao convertidos para divs com estilos inline no React (ja que pseudo-elementos nao funcionam inline)
- O icone de briefcase e location usara Lucide (`Briefcase`, `MapPin`) em vez de Font Awesome
- A fonte Inter ja esta disponivel no projeto via Tailwind

### Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/components/jobs/LinkedInPostGenerator.tsx` | Criar - componente principal do gerador |
| `src/components/jobs/LinkedInPostDialog.tsx` | Criar - dialog wrapper |
| `src/components/jobs/JobDetail.tsx` | Modificar - adicionar botao "Gerar Post" |
| `package.json` | Modificar - adicionar `html-to-image` |

