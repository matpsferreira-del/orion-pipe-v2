

## Integrar o portal Orion Talent Compass com este sistema

### Situacao atual

O portal [Orion Talent Compass](/projects/d9bf9eb8-06f5-464c-9364-8aa366353d12) ja esta **quase 100% integrado**:

- Ele le as vagas diretamente do nosso banco (usando a anon key via `saasSupabase`)
- Ele tem uma edge function `submit-application` que salva localmente E sincroniza com o nosso sistema
- A sincronizacao usa `resolve_party` + insert em `applications` — exatamente o que precisamos

### O que falta (unica coisa)

A edge function do portal precisa da secret **`SAAS_SERVICE_ROLE_KEY`** para conseguir escrever no nosso banco. Sem ela, o sync e pulado silenciosamente (o candidato ve sucesso, mas os dados nao chegam aqui).

Na linha 95-101 da edge function:
```text
const saasKey = Deno.env.get("SAAS_SERVICE_ROLE_KEY");
if (!saasKey) {
  console.warn("SAAS_SERVICE_ROLE_KEY not configured – skipping SaaS sync");
  return { success: true, saas_synced: false };
}
```

### Passo a passo para resolver

1. **Abra o projeto [Orion Talent Compass](/projects/d9bf9eb8-06f5-464c-9364-8aa366353d12)**
2. **Peca ao Lovable para adicionar a secret** `SAAS_SERVICE_ROLE_KEY` com o valor da service role key deste projeto
3. Pronto — as candidaturas feitas pelo portal passarao a aparecer automaticamente:
   - Na pagina **Pessoas** (com badge "Via Portal")
   - Na **vaga correspondente** (lista de candidatos)

### O que NAO precisa mudar neste projeto

Nenhuma alteracao e necessaria aqui. A edge function `public-apply` deste sistema nao e nem usada pelo novo portal — ele faz a insercao direta via service role key, o que e ate mais eficiente.

### Como obter a service role key

Voce pode encontra-la acessando o backend deste projeto (Lovable Cloud). Ela esta listada nas configuracoes do projeto.

### Validacao

Apos configurar a secret no portal:
1. Candidate-se a uma vaga pelo portal
2. Verifique na pagina **Pessoas** deste sistema se o candidato aparece com `created_from = 'site'`
3. Verifique na vaga correspondente se a candidatura foi registrada

### Sobre o campo "area" das vagas

O portal ja busca as vagas diretamente do nosso banco, entao o campo `area` que adicionamos recentemente ja esta disponivel automaticamente para filtros no portal — basta o portal usar esse campo na interface dele (se ainda nao estiver usando).

