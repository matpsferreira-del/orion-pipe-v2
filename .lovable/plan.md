

## Importar CNPJs para Empresas Existentes

O objetivo e criar uma funcionalidade para atualizar o CNPJ de empresas que ja existem no sistema, usando um arquivo Excel com duas colunas: o nome da empresa (para identificar) e o CNPJ (para atualizar).

### Como vai funcionar

1. O usuario clica em um botao "Importar CNPJs" na pagina de Empresas
2. Seleciona um arquivo Excel com pelo menos duas colunas: nome da empresa e CNPJ
3. O sistema faz o match pelo nome da empresa (comparacao flexivel, ignorando maiusculas/minusculas e espacos extras)
4. Mostra uma pre-visualizacao com:
   - Empresas encontradas no sistema (match feito) com o CNPJ que sera atualizado
   - Empresas nao encontradas (sem match)
   - Empresas que ja possuem CNPJ (para decidir se sobrescreve ou nao)
5. O usuario confirma e o sistema atualiza apenas o campo CNPJ das empresas encontradas

### Detalhes Tecnicos

**Novo componente: `ImportCnpjDialog.tsx`**
- Dialog dedicado para importacao de CNPJs
- Reutiliza as funcoes utilitarias existentes (`normalizeCnpj`, `sanitizeText`, `findColumn`)
- Fluxo:
  1. Le o arquivo Excel
  2. Detecta colunas de "empresa" e "cnpj" com mapeamento flexivel (mesma logica do `findColumn` existente)
  3. Busca todas as empresas do banco via `supabase.from('companies').select('id, nome_fantasia, razao_social, cnpj')`
  4. Faz match por nome (comparando `nome_fantasia` e `razao_social` com o valor da planilha, case-insensitive e trimmed)
  5. Exibe tabela de pre-visualizacao com status de cada linha: "Encontrada", "Nao encontrada", "Ja possui CNPJ"
  6. Ao confirmar, executa `supabase.from('companies').update({ cnpj }).eq('id', matchedId)` para cada empresa

**Alteracao em `Empresas.tsx`**
- Adicionar botao "Importar CNPJs" ao lado dos botoes existentes
- Adicionar state para controlar abertura do dialog
- Importar e renderizar o novo `ImportCnpjDialog`

**Tratamento do CNPJ**
- Reutiliza a funcao `normalizeCnpj` do `importValidation.ts` para converter notacao cientifica e formatar como XX.XXX.XXX/XXXX-XX
- Opcao de checkbox para sobrescrever CNPJs existentes (desmarcado por padrao)

