

## Consolidacao de Contatos Duplicados na Importacao (com CNPJ)

### O que muda

Ao importar contatos, o sistema vai agrupar linhas duplicadas usando **nome do contato + CNPJ da empresa** (em vez de apenas nome da empresa). Isso garante que contatos com o mesmo nome sejam consolidados corretamente mesmo quando o nome da empresa varia, desde que o CNPJ seja o mesmo.

### Regra de agrupamento

A chave de agrupamento sera: `nome_contato_normalizado + cnpj_digitos`

- Se o CNPJ estiver preenchido, ele e o identificador principal da empresa
- Se o CNPJ estiver vazio, usa o nome da empresa como fallback
- Chave final: `normalizar(contato) | cnpj_digitos OU normalizar(empresa)`

### Exemplo pratico

```text
Planilha:
  Joao Silva | Empresa X  | 12.345.678/0001-90 | joao@x.com  | (11) 99999-1111
  Joao Silva | Empresa X  | 12.345.678/0001-90 |             | (11) 98888-2222
  Joao Silva | Empresa X  | 12.345.678/0001-90 | joao2@x.com |
  Maria Lima | Empresa X  | 12.345.678/0001-90 | maria@x.com | (11) 97777-3333

Resultado:
  Joao Silva | 12345678000190 | joao@x.com ; joao2@x.com | (11) 99999-1111 ; (11) 98888-2222
  Maria Lima | 12345678000190 | maria@x.com             | (11) 97777-3333
```

### Detalhes Tecnicos

**Alteracao em `ImportContactsDialog.tsx`**

1. Adicionar campo `mergedCount?: number` na interface `ImportRow`
2. Criar funcao `consolidateContacts(rows: ImportRow[]): ImportRow[]`:
   - Extrai apenas digitos do CNPJ para comparacao
   - Gera chave: `normalizar(contato) | digitos_cnpj` (ou `normalizar(contato) | normalizar(empresa)` se CNPJ vazio)
   - Para cada grupo com a mesma chave:
     - Coleta todos os emails unicos e nao-vazios, junta com ` ; `
     - Coleta todos os telefones unicos e nao-vazios, junta com ` ; `
     - Coleta todos os WhatsApps unicos e nao-vazios, junta com ` ; `
     - Usa primeiro cargo, linkedin, e dados da empresa nao-vazios
     - Define `mergedCount` com a quantidade de linhas mescladas
3. Chamar `consolidateContacts` apos o parse/validacao e antes do `checkDuplicates`
4. Atualizar a tabela de pre-visualizacao:
   - Mostrar badge "X linhas mescladas" quando `mergedCount > 1`
   - Mostrar badge com contagem de contatos consolidados no resumo

**Alteracao em `ImportDialog.tsx` (importacao de empresas)**

1. Na funcao `checkDuplicatesAndGroup`, ao adicionar contatos ao grupo da empresa:
   - Usar nome do contato normalizado como chave (alem do email atual)
   - Quando encontrar contato com mesmo nome, mesclar telefones e emails em vez de ignorar
   - Contatos com mesmo nome terao: emails concatenados com ` ; `, telefones concatenados com ` ; `

Nenhuma alteracao de banco de dados necessaria -- os campos `email`, `telefone` e `whatsapp` sao do tipo `text` e suportam valores concatenados.
