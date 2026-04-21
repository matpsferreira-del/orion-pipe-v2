---
name: pathly-sync
description: Integração bidirecional automática Orion ↔ Pathly. Push instantâneo Orion→Pathly via pathly-sync edge function; pull reverso Pathly→Orion via cron job pathly-pull rodando a cada 30s. Conflitos resolvidos com "Orion sempre ganha" (só insere registros novos no pull, nunca sobrescreve). Cadastro de projetos espelha o formulário do Pathly (situação, modelo, estado/cidade, preferência de região, cidades de interesse).
type: feature
---

# Integração Orion ↔ Pathly

## Arquitetura
- **Push (Orion → Pathly, instantâneo)**: hooks de mutação em `useOutplacementProjects.ts` chamam `pathly-sync` (proxy) → `orion-bridge` no Pathly.
- **Pull (Pathly → Orion, polling 30s)**: cron job `pathly-pull-30s` (pg_cron) invoca edge function `pathly-pull` que chama action `list_plan_data` na bridge e faz INSERT-only no Orion.

## Conflito: Orion sempre ganha
O pull reverso **nunca atualiza** registros existentes — só insere novos. Deduplicação:
- Contatos: `linkedin_url` (normalizado) ou `nome+empresa` (lowercase)
- Vagas: `job_url` (lowercase) ou `título+empresa`

## Secrets necessários
- `PATHLY_FUNCTIONS_URL`: base URL das edge functions do projeto Pathly
- `ORION_BRIDGE_SECRET`: shared secret entre Orion e bridge `orion-bridge`

## Actions na bridge orion-bridge (Pathly)
- `create_plan` (recebe employment_status, work_model, state, city, region_preference, cities_of_interest)
- `activate_plan`, `upsert_company`, `upsert_contact`, `upsert_market_job`
- `list_plan_data` (usado pelo pathly-pull), `list_mentee_contributions`, `list_active_plans`

## Cadastro de projeto (alinhado ao Pathly)
O `ProjectDialog` captura os mesmos campos do "Novo Plano Estratégico" do Pathly:
- **Perfil**: cargo (target_role), área (target_industry), situação atual (empregado/desempregado/em_transicao), modelo de trabalho (presencial/hibrido/remoto)
- **Localização**: estado + cidade (selects da base BRAZIL_STATES/BRAZIL_CITIES), preferência de região (mesma_regiao/outras_regioes/indiferente), cidades de interesse (jsonb array)

Vocabulário Orion → Pathly aplicado em `createPathlyPlan`:
- empregado→employed, desempregado→unemployed, em_transicao→in_transition
- presencial→on_site, hibrido→hybrid, remoto→remote
- mesma_regiao→same_region, outras_regioes→other_regions, indiferente→any

`target_location` é mantido sincronizado como `"Cidade, UF"` para retrocompatibilidade.

## Tabelas no Orion com colunas pathly_*
- `outplacement_projects.pathly_plan_id`, `pathly_synced_at`
- `outplacement_projects` ganhou: `situacao_atual`, `modelo_trabalho`, `estado`, `cidade`, `preferencia_regiao`, `cidades_interesse` (jsonb)
- `outplacement_contacts.pathly_synced_at`
- `outplacement_market_jobs.pathly_synced_at`

## Pacote para colar no Pathly
Em `/mnt/documents/pathly-integration/`:
- `migration.sql` — cria `market_jobs` + coluna `source` em `mentorship_plans`
- `orion-bridge.ts` — substitui o arquivo da bridge, contém todas as actions
- `README.md` — passo a passo

⚠️ A action `create_plan` na bridge do Pathly precisa aceitar os novos campos (employment_status, work_model, state, city, region_preference, cities_of_interest) e gravar nas colunas equivalentes de `mentorship_plans`. Se a bridge ainda não suportar, esses campos chegam como ignorados (não quebra o push), mas não serão persistidos lá até a bridge ser atualizada.
