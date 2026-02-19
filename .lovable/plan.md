
## Finalizar integração com o portal externo

### O que será feito

**1. Atualizar `PORTAL_URL` no `JobDetail.tsx`**

Substituir o placeholder pela URL real do portal:

```typescript
// ANTES
const PORTAL_URL = 'https://seu-portal-de-vagas.lovable.app';

// DEPOIS
const PORTAL_URL = 'https://recruit-sync-spot.lovable.app';
```

Isso faz o botão "Copiar link" e o link "Abrir no portal" apontarem para o endereço correto.

---

**2. Migration SQL — liberar leitura pública de companies**

A tabela `companies` atualmente só pode ser lida por usuários autenticados. O portal externo faz a consulta como usuário anônimo e usa um join com `companies` para buscar o nome da empresa (`nome_fantasia`). Sem essa policy, o nome da empresa não aparece nas vagas do portal.

```sql
CREATE POLICY "Public can view companies with published jobs"
  ON public.companies FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT company_id FROM public.jobs 
      WHERE published = true AND status = 'open'
    )
  );
```

Essa policy é segura: o usuário anônimo só consegue ler dados de empresas que já têm pelo menos uma vaga pública e aberta — nenhum dado sensível fica exposto.

---

### Checklist para a vaga aparecer no portal

Após as mudanças, para uma vaga aparecer no portal ela precisa:

1. Status = **Aberta** (não Rascunho)
2. Clicar em **"Publicar no Site"** no detalhe da vaga (isso seta `published = true` e gera o `slug`)

Se a vaga que você criou ainda está como rascunho ou não foi publicada pelo botão, ela não vai aparecer.
