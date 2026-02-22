

## Adicionar politicas RLS para acesso anonimo

### O que sera feito
Adicionar 4 novas politicas RLS para permitir integracao com o outro projeto:

1. **Allow anon insert on `companies`** - INSERT sem restricao
2. **Allow anon insert on `contacts`** - INSERT sem restricao
3. **Allow anon insert on `opportunities`** - INSERT sem restricao
4. **Allow anon read on `profiles`** - SELECT sem restricao

### Observacao importante sobre nomes das tabelas
As tabelas no banco de dados usam nomes em ingles (`companies`, `contacts`, `opportunities`, `profiles`), nao em portugues. Os comandos SQL serao ajustados para os nomes corretos.

### Alerta de seguranca
Essas politicas permitem que **qualquer pessoa** (sem autenticacao) insira dados nessas tabelas e leia todos os perfis. Isso e aceitavel para integracao entre projetos, mas e importante estar ciente do risco. Se no futuro quiser restringir, podemos adicionar validacao por token ou API key.

### Detalhes tecnicos

Migration SQL a ser executada:

```sql
-- Allow anonymous inserts on companies
CREATE POLICY "Allow anon insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (true);

-- Allow anonymous inserts on contacts
CREATE POLICY "Allow anon insert contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (true);

-- Allow anonymous inserts on opportunities
CREATE POLICY "Allow anon insert opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (true);

-- Allow anonymous read on profiles
CREATE POLICY "Allow anon read profiles"
  ON public.profiles FOR SELECT
  USING (true);
```

Nenhuma alteracao de codigo frontend sera necessaria.

