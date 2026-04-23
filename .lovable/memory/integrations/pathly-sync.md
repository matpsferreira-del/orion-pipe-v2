---
name: pathly-sync
description: Integração bidirecional automática Orion ↔ Pathly. Push instantâneo Orion→Pathly via pathly-sync edge function; pull reverso Pathly→Orion via cron job pathly-pull rodando a cada 30s. Conflitos resolvidos com "Orion sempre ganha" (só insere registros novos no pull, nunca sobrescreve). Cadastro de projetos espelha o formulário do Pathly (situação, modelo, estado/cidade, preferência de região, cidades de interesse). Bridge orion-bridge no Pathly persiste work_model, region_preference, available_cities, target_positions e wants_career_change quando o plano é criado.
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

## Vocabulário Orion → Pathly aplicado em `createPathlyPlan`
- empregado→employed, desempregado→unemployed, em_transicao→in_transition (não persistido no Pathly hoje — sem coluna)
- presencial→presencial, hibrido→hibrido, remoto→remoto (Pathly aceita PT-BR direto)
- mesma_regiao→same_region, outras_regioes→open_to_change, indiferente→open_to_change
- estado é cortado em VARCHAR(2) antes do envio
- target_role → vira `target_positions` jsonb na bridge e marca `wants_career_change=true` se diferir de `current_position`
- cidades_interesse → `available_cities` jsonb

## Schema relevante de `mentorship_plans` no Pathly
Colunas usadas pela bridge: `current_position`, `current_area`, `state` (varchar(2)), `city`, `work_model` CHECK (`presencial|hibrido|remoto`), `region_preference` CHECK (`same_region|open_to_change`), `available_cities` (jsonb), `target_positions` (jsonb), `wants_career_change` (bool), `mentee_email`, `orionpipe_client_id`, `status`. **Não existe** coluna `employment_status` nem `target_role` direto.

## Tabelas no Orion com colunas pathly_*
- `outplacement_projects.pathly_plan_id`, `pathly_synced_at`
- `outplacement_projects` ganhou: `situacao_atual`, `modelo_trabalho`, `estado`, `cidade`, `preferencia_regiao`, `cidades_interesse` (jsonb)
- `outplacement_contacts.pathly_synced_at`
- `outplacement_market_jobs.pathly_synced_at`

## Pacote para colar no Pathly
Em `/mnt/documents/pathly-integration/`:
- `migration.sql` — cria `market_jobs` + coluna `source` em `mentorship_plans`
- `orion-bridge.ts` — substitui o arquivo da bridge, persiste corretamente todos os campos do plano e expõe action `update_plan` para reenvio dos dados cadastrais
- `README.md` — passo a passo

## Sincronização dos dados cadastrais
- `mirrorProjectToPathly` / `ensureProjectPathlyLink` chamam `update_plan` quando o plano já existe, garantindo que situação, modelo de trabalho, estado, cidade, preferência de região, cidades de interesse e cargo/área alvo sejam atualizados em cada espelho. Para planos novos, `create_plan` cobre os mesmos campos.

⚠️ Ao mudar o vocabulário aceito por `region_preference` ou `work_model` no Pathly, atualizar o `regiaoMap`/`modeloMap` em `src/lib/pathlySync.ts` e a normalização correspondente na bridge.
