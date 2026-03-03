

# Botão "Acionar Automação" — Já implementado

O botão "Acionar Automação" **já faz exatamente o que foi solicitado**. No arquivo `src/pages/MapeamentoVagas.tsx` (linhas 78-85), o `triggerMutation` executa:

```typescript
const { error } = await supabase.from('automation_triggers').insert({
  search_term: filterSearchTerm !== ALL ? filterSearchTerm : (search || null),
  location: [cidade, estado].filter(Boolean).join(', ') || null,
  status: 'pending',
});
```

Isso já insere um registro na tabela `automation_triggers` com `search_term`, `location` e `status: 'pending'`.

## O que pode estar falhando

O problema reportado anteriormente ("a integração não funciona daqui para lá") não é no INSERT — ele funciona. O problema é que **nenhum serviço externo (Manus) está consumindo esses registros**. Não existe webhook ou chamada de API que notifique o Manus quando um trigger é criado.

## Plano — Nenhuma mudança necessária no INSERT

O código atual já atende ao requisito descrito. Se o objetivo é garantir que o Manus receba a notificação, seria necessário:

1. Obter a URL da API do Manus
2. Criar uma edge function que faça POST para essa URL após o INSERT
3. Chamar essa edge function no `onSuccess` da mutation

Mas o INSERT em si já está correto e funcional.

