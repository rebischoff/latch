-- SubHub: drop item_spec_participation (task 37ai).
-- Prerequisite: 37ai DAL shipped. Decision: docs/decisions/catalog.md V1-V8.
--
-- Apply ONLY after the DAL/matcher code no longer queries item_spec_participation
-- (37ai steps 2-4: item-effective-specs.ts, item-detail.ts, item-spec-participation-write.ts,
-- part-specs.ts, estimate-part-resolver.ts, spec-match.ts, item_detail.surface.yaml).
-- Running this first would 500 any in-flight code still reading the table.

BEGIN;

DROP TABLE IF EXISTS item_spec_participation;

COMMIT;
