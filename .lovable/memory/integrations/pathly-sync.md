---
name: pathly-sync
description: Integração bidirecional automática Orion ↔ Pathly. Push instantâneo Orion→Pathly via pathly-sync edge function; pull reverso Pathly→Orion via cron job pathly-pull rodando a cada 30s. Conflitos resolvidos com "Orion sempre ganha" (só insere registros novos no pull, nunca sobrescreve).
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
- `create_plan`, `activate_plan`, `upsert_company`, `upsert_contact`, `upsert_market_job`
- `list_plan_data` (usado pelo pathly-pull), `list_mentee_contributions`, `list_active_plans`

## Tabelas no Orion com colunas pathly_*
- `outplacement_projects.pathly_plan_id`, `pathly_synced_at`
- `outplacement_contacts.pathly_synced_at`
- `outplacement_market_jobs.pathly_synced_at`

## Pacote para colar no Pathly
Em `/mnt/documents/pathly-integration/`:
- `migration.sql` — cria `market_jobs` + coluna `source` em `mentorship_plans`
- `orion-bridge.ts` — substitui o arquivo da bridge, contém todas as actions
- `README.md` — passo a passo
