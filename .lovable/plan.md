

## Tela de Revisao de Empresas Duplicadas (por nome similar)

### Contexto

Foram encontrados diversos grupos de empresas com nomes muito parecidos no banco de dados. Exemplos:

| Grupo | Empresas |
|-------|----------|
| AbbVie | "AbbVie", "AbbVie (unidade Cidade Monções)" |
| Aurora | "Aurora", "Aurora Coop", "Aurora Fine Brands" |
| CPFL | "CPFL", "CPFL Piratininga", "CPFL Renováveis" |
| ENGIE | "ENGIE", "ENGIE Brasil" |
| Gran | "Gran", "Gran Cursos", "Gran Services" |
| Schulz | "Schulz", "Schulz S/A e Controlada" |
| Tupy | "Tupy", "Tupy S/A e Controladas" |
| Sonoco | "Sonoco", "Sonoco do Brasil" |
| Thomson Reuters | "Thomson Reuters", "Thomson Reuters Brasil" |
| ...e mais ~30 grupos |

Nenhuma dessas empresas tem oportunidades ou mais de 1-2 contatos, o que facilita a mesclagem.

### O que sera construido

Uma nova tela/dialog acessivel pela pagina de Empresas com um botao "Revisar Duplicatas" que:

1. **Lista todos os grupos de nomes similares** agrupados pela primeira palavra do nome
2. Para cada grupo, mostra as empresas com seus contatos
3. Permite selecionar qual empresa **manter** (sobrevivente)
4. Ao mesclar: move contatos, oportunidades, atividades e tarefas para a empresa sobrevivente e exclui as demais
5. Permite marcar como "Nao e duplicata" para ignorar o grupo

### Detalhes Tecnicos

**1. Habilitar extensao `pg_trgm` (migracao SQL)**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Isso permite usar a funcao `similarity()` do PostgreSQL para encontrar nomes parecidos automaticamente.

**2. Criar funcao SQL `find_similar_companies`**

Uma funcao no banco que retorna pares de empresas com nome similar (similaridade > 0.5), agrupados. Isso evita trazer 1284 empresas para o front-end e comparar no cliente.

**3. Novo componente `CompanyDuplicatesDialog.tsx`**

- Dialog com lista de grupos de empresas similares
- Cada grupo mostra as empresas lado a lado com seus dados (nome, cidade, estado, contatos)
- Radio button para selecionar a sobrevivente
- Botao "Mesclar" e "Nao e duplicata"
- Ao mesclar:
  - `UPDATE contacts SET company_id = :survivor WHERE company_id = :merged`
  - `UPDATE opportunities SET company_id = :survivor WHERE company_id = :merged`
  - `UPDATE activities SET company_id = :survivor WHERE company_id = :merged`
  - `UPDATE tasks SET company_id = :survivor WHERE company_id = :merged`
  - `DELETE FROM companies WHERE id = :merged`

**4. Novo hook `useCompanyDuplicates.ts`**

- `useCompanyDuplicates()` -- chama a funcao SQL para buscar pares similares
- `useMergeCompanies()` -- executa a mesclagem (move referencias + deleta duplicada)
- `useDismissCompanyDuplicate()` -- marca par como ignorado (opcional: tabela de dismissals ou lista local)

**5. Botao na pagina Empresas**

Adicionar botao "Revisar Duplicatas" ao lado dos botoes existentes no header da pagina.

### Fluxo do usuario

1. Clica em "Revisar Duplicatas" na pagina de Empresas
2. Dialog abre mostrando o primeiro grupo de empresas similares
3. Seleciona qual empresa manter
4. Clica "Mesclar" -- contatos e dados sao movidos, duplicata e excluida
5. Proximo grupo aparece automaticamente
6. Ao terminar todos os grupos, mostra mensagem de sucesso
