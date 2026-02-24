

## Alteracao da tabela job_postings: `location` -> `cidade` + `estado`

### Objetivo
Substituir a coluna unica `location` por duas colunas separadas (`cidade` e `estado`) para receber os dados ja estruturados da API do Manus, eliminando a necessidade de parsing com regex.

### Etapas

#### 1. Migracao do banco de dados
- Adicionar colunas `cidade` (text, nullable) e `estado` (text, nullable) na tabela `job_postings`
- Migrar dados existentes: tentar extrair cidade e estado do campo `location` atual para popular as novas colunas
- Remover a coluna `location`

```text
ALTER TABLE public.job_postings ADD COLUMN cidade text;
ALTER TABLE public.job_postings ADD COLUMN estado text;
-- Migrar dados existentes (best effort)
ALTER TABLE public.job_postings DROP COLUMN location;
```

#### 2. Atualizar a pagina MapeamentoVagas.tsx
- Alterar a interface `JobPosting`: remover `location`, adicionar `cidade` e `estado`
- Simplificar drasticamente os filtros:
  - **Estado**: listar valores unicos diretamente de `posting.estado` (sem regex)
  - **Cidade**: listar valores unicos de `posting.cidade`, filtrados pelo estado selecionado
- Simplificar a logica de filtragem: comparacao direta em vez de regex
- Atualizar a tabela: coluna "Local" exibira `cidade, estado` concatenados
- Atualizar a busca textual para pesquisar em `cidade` e `estado`
- Remover o import de `BRAZIL_STATES` (ou manter apenas para exibir nome completo do estado no filtro)

### Secao tecnica

**Banco de dados:**
- A migracao adiciona as colunas nullable para nao quebrar insercoes existentes
- Dados antigos terao cidade/estado como null caso nao consigam ser parseados

**Frontend (MapeamentoVagas.tsx):**
- Remove toda a logica de `locationMatchesState` e regex de extracao
- Os `useMemo` de `extractedStates` e `extractedCities` passam a ser simples `Array.from(new Set(...))`
- Na tabela, a coluna "Local" mostra `[cidade], [estado]` com fallback para quando um dos dois estiver vazio

