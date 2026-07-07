-- Drop site.property_owner_party_id — legal owner recorded via site_contact + site relations.

BEGIN;

DROP INDEX IF EXISTS site_property_owner_party_id_idx;

ALTER TABLE site
  DROP COLUMN IF EXISTS property_owner_party_id;

COMMIT;
