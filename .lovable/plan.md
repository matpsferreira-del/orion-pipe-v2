
## Diagnóstico e correção: candidatos do portal não aparecem no sistema

### O que foi investigado

Testei a edge function `public-apply` diretamente e ela **funciona perfeitamente**. Um candidato de teste foi criado no banco com:
- `created_from = 'site'` na tabela `party`
- Role `candidate` atribuída automaticamente
- Candidatura registrada na tabela `applications` com `source = 'website'`

O dado está no banco. O problema é de **exibição e integração na interface**.

### Dois problemas identificados

**Problema 1 — Aba ATS na ficha de pessoa está vazia (placeholder)**

Em `src/components/parties/PartyDetailDialog.tsx`, a aba "ATS" mostra uma mensagem de placeholder desativada:
```tsx
<p>Candidaturas aparecerão aqui quando o módulo ATS for implementado.</p>
```
Não busca candidaturas reais do candidato. Precisa ser implementada.

**Problema 2 — Portal externo provavelmente com banco diferente**

O portal `recruit-sync-spot.lovable.app` é um projeto separado. Se ele não estiver configurado com as credenciais deste projeto, as candidaturas feitas lá vão para outro banco e nunca chegam aqui. Isso requer ajuste no projeto do portal (fora do escopo desta mudança, mas vamos deixar instruções claras).

---

### O que será implementado

#### 1. Aba ATS funcional no perfil de pessoa (PartyDetailDialog)

Criar um hook `usePartyApplications(partyId)` em `src/hooks/useApplications.ts` que busca todas as candidaturas da pessoa, incluindo dados da vaga.

A aba ATS mostrará:
- Lista de vagas para as quais a pessoa se candidatou
- Nome da vaga, empresa, data de candidatura, status atual e etapa do funil
- Badge de status colorido (novo, em análise, contratado, reprovado, etc.)
- Origem da candidatura (site, manual, importação)

```typescript
// Novo hook
export function usePartyApplications(partyId: string | undefined) {
  return useQuery({
    queryKey: ['party-applications', partyId],
    queryFn: async () => {
      // Busca candidaturas + vaga + etapa
    },
    enabled: !!partyId,
  });
}
```

#### 2. Banco de Talentos — badge indicando candidatos do portal

Na página `Pessoas.tsx`, adicionar um badge "Via Portal" para pessoas com `created_from = 'site'`, facilitando a identificação visual de candidatos que vieram do portal público.

#### 3. Filtro "Via Portal" no Banco de Talentos

Adicionar uma opção de filtro por origem (`created_from = 'site'`) na página de Pessoas, para que o time possa filtrar apenas candidatos que se candidataram pelo portal.

---

### Arquivos a serem alterados

| Arquivo | O que muda |
|---|---|
| `src/hooks/useApplications.ts` | Novo hook `usePartyApplications(partyId)` |
| `src/components/parties/PartyDetailDialog.tsx` | Aba ATS implementada com candidaturas reais |
| `src/pages/Pessoas.tsx` | Badge "Via Portal" + filtro por origem |

---

### Observação sobre o portal externo

Se candidaturas feitas no portal ainda não aparecem, é porque o projeto `recruit-sync-spot` precisa ser configurado com as credenciais deste projeto. Isso é uma configuração no projeto separado do portal — não neste arquivo.
