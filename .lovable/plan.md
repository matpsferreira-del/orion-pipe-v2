

# Portal Público de Vagas — Projeto Separado + Integração via API

## Por que projeto separado é a melhor escolha

O sistema atual tem um conflito de rotas que torna impossível manter o portal público e o sistema interno no mesmo app. Além disso, um portal separado oferece:

- URL própria (ex: `vagas.suaempresa.com.br`)
- Visual totalmente customizável sem afetar o sistema interno
- Deploys independentes — atualizar o portal não afeta o CRM/ATS
- Sem conflito de autenticação — o portal é 100% público

## Como a integração funciona

```text
[PROJETO NOVO — Portal Público]          [PROJETO ATUAL — CRM/ATS]
  React + Vite (Lovable)                   Banco de dados + Edge Function
         |                                          |
         |  GET /rest/v1/jobs                       |
         |  (leitura pública via RLS)  ←————————————|
         |                                          |
         |  POST /functions/v1/public-apply         |
         |  (candidatura anônima) ←————————————————|
         |                                          |
  Candidato se inscreve          Candidato aparece no Kanban ✓
```

O backend (banco + edge function) já está 100% pronto neste projeto. O projeto novo só precisa das credenciais públicas para se comunicar com ele.

## O que precisa ser feito neste projeto (CRM/ATS)

### 1. Remover as rotas públicas do `App.tsx`
As rotas `/vagas` (JobBoard) e `/vagas/:slug` (PublicJobDetail) devem ser removidas do `App.tsx`. Isso libera o `/vagas` interno para funcionar corretamente.

```typescript
// Remover estas duas linhas:
<Route path="/vagas" element={<JobBoard />} />
<Route path="/vagas/:slug" element={<PublicJobDetail />} />
```

### 2. Ajustar o `portalUrl` no `JobDetail.tsx`
O link "Copiar link do portal" atualmente aponta para `window.location.origin/vagas/slug`. Como o portal vai ser um domínio separado, esse link precisa apontar para a URL do novo projeto.

Solução: usar uma constante configurável:
```typescript
const PORTAL_URL = 'https://[url-do-novo-projeto].lovable.app';
const portalUrl = jobSlug ? `${PORTAL_URL}/vagas/${jobSlug}` : null;
```

### 3. Remover imports desnecessários
Remover as importações de `JobBoard` e `PublicJobDetail` do `App.tsx` e deletar (ou manter para referência) os arquivos `src/pages/public/JobBoard.tsx` e `src/pages/public/PublicJobDetail.tsx`.

## O que o projeto novo precisa

O projeto novo (portal público) será criado no Lovable como um projeto React simples. Ele precisará de apenas **2 credenciais** deste projeto:

| Credencial | Valor | Para que serve |
|---|---|---|
| URL do banco | `https://ocrsfcjiutvojzdfotou.supabase.co` | Buscar vagas publicadas |
| Chave pública (anon key) | `eyJhbGci...` | Autenticar chamadas públicas |
| URL da Edge Function | `https://ocrsfcjiutvojzdfotou.supabase.co/functions/v1/public-apply` | Enviar candidaturas |

Essas credenciais são **públicas e seguras** — a chave anon key não dá acesso a dados privados, apenas ao que as políticas de segurança permitem (vagas publicadas).

## Estrutura do projeto novo (portal)

O projeto novo será criado com o prompt abaixo no Lovable:

```
Crie um portal público de vagas em React que:
1. Liste vagas abertas buscando da URL: https://ocrsfcjiutvojzdfotou.supabase.co/rest/v1/jobs
   com filtro ?published=eq.true&status=eq.open&select=id,title,location,salary_min,salary_max,deadline,description,slug,published_at,companies(nome_fantasia)
   Usando o header: apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcnNmY2ppdXR2b2p6ZGZvdG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTc1MjMsImV4cCI6MjA3OTg3MzUyM30.gvisk-UTdz4_6auncDKJqmRc-aQraL4HIScACd5DHlg

2. Exiba detalhes de cada vaga em /vagas/:slug

3. Tenha formulário de candidatura que chama via POST:
   https://ocrsfcjiutvojzdfotou.supabase.co/functions/v1/public-apply
   com body JSON: { job_slug, full_name, email, phone, linkedin_url, city, state, notes }
```

## Sequência de execução neste projeto

1. Remover as rotas públicas do `App.tsx` (resolve o bug de não conseguir criar vagas)
2. Ajustar `JobDetail.tsx` para o `portalUrl` apontar para o novo domínio (com placeholder configurável)
3. Limpar imports órfãos

Após esses 3 passos, o sistema interno volta a funcionar normalmente — o botão "Vagas" na sidebar leva para o gerenciador interno, e o botão "Publicar no Site" gera um link que aponta para o novo projeto externo.

