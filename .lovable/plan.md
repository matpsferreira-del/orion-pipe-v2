

# Plano: Formatação de CV no módulo Recrutamento

## Resumo
Adicionar uma nova página "Formatação de CV" ao módulo de Recrutamento, com link no sidebar e rota dedicada. O código fornecido será adaptado para usar TypeScript, Tailwind CSS e o padrão do projeto, incluindo o uso de Lovable AI (via edge function) em vez de chamada direta à API Anthropic no frontend.

## O que será feito

### 1. Criar página `src/pages/FormatacaoCV.tsx`
- Converter o componente fornecido para TypeScript com tipagem adequada
- Substituir os estilos inline (`S = {...}`) por classes Tailwind para consistência com o design system
- Remover a lógica de carregamento de mammoth via script tag e usar import dinâmico ou manter como script externo com tipagem
- A página mantém 3 etapas: upload, processamento e editor/preview

### 2. Criar edge function `supabase/functions/extract-cv/index.ts`
- Recebe o arquivo (base64 para PDF, texto extraído para DOCX) 
- Chama a Lovable AI (modelo `google/gemini-2.5-pro` ou `openai/gpt-5`) com o prompt de extração
- Retorna o JSON estruturado do CV
- Isso evita expor chaves de API no frontend

### 3. Atualizar navegação
- **`src/components/layout/AppSidebar.tsx`**: Adicionar item `{ to: '/formatacao-cv', icon: FileText, label: 'Formatação de CV' }` no array `recrutamento`
- **`src/components/layout/TopNav.tsx`**: Adicionar `'/formatacao-cv': 'recrutamento'` no `routeToTab`
- **`src/App.tsx`**: Adicionar rota `<Route path="/formatacao-cv" element={<FormatacaoCV />} />`

### 4. Adaptações do código fornecido
- Substituir chamada direta a `api.anthropic.com` por chamada à edge function
- Manter a lógica de export PDF usando `html-to-image` + `jspdf` (já disponíveis no projeto)
- Remover estilos CSS globais injetados via `document.createElement("style")` e usar Tailwind + `@keyframes` no `index.css`
- Adicionar tipagem para o objeto `cvData`

### Considerações técnicas
- O modelo Lovable AI suporta processamento de texto para extração estruturada, adequado para este caso
- PDFs binários precisarão ser enviados como base64 para a edge function, que usará o modelo com suporte multimodal
- A exportação PDF já segue o padrão arquitetural do projeto (html-to-image + jsPDF)

