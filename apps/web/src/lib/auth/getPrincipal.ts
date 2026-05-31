import type { Principal } from "@latch/contracts";
import { SEED_TECH_ID } from "@latch/dal";

/**
 * Step 3 stub principal (no IdP). Real auth provider choice stays open as **D2**.
 *
 * | Env | Purpose | Default |
 * |-----|---------|---------|
 * | `LATCH_STUB_USER` | `Principal.id` | `SEED_TECH_ID` (`seed-field-tech`) |
 * | `LATCH_STUB_ROLE` | Single role passed to `PolicyService` | `field_tech` |
 *
 * **Seed roles (pilot):**
 *
 * | Role | Typical `LATCH_STUB_USER` | Manual checks |
 * |------|---------------------------|---------------|
 * | `field_tech` | default (`SEED_TECH_ID`) | S1, S4 — financial Fields omitted; own-job row rules |
 * | `office_admin` | `SEED_ADMIN_ID` optional (`rowScope: all`) | S3 — financial Fields readable |
 *
 * Switch role locally:
 *
 * ```bash
 * LATCH_STUB_ROLE=office_admin npm run dev
 * ```
 *
 * @see docs/foundations/development.md
 */
export const getPrincipal = (): Principal => ({
  id: process.env.LATCH_STUB_USER ?? SEED_TECH_ID,
  roles: [process.env.LATCH_STUB_ROLE ?? "field_tech"],
});
