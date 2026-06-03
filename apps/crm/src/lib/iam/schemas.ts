import { z } from "zod";

/**
 * v1 built-in + app role catalog — keep aligned with
 * `docs/phases/03-identity-iam/decisions.md` and policy YAML comments.
 */
export const KNOWN_ROLE_IDS = [
  "field_tech",
  "office_admin",
  "iam_master",
  "data_master",
] as const;

export const RoleIdSchema = z.enum(KNOWN_ROLE_IDS);

/**
 * Pilot `user_roles_detail` PATCH schema — keep aligned with
 * `apps/crm/modules/iam/generated/user_roles_detail.schema.generated.ts` Field ids.
 *
 * `role_assignments` replaces the full `latch_user_roles` set for the anchor user (task 10).
 */
export const UserRolesDetailPatchSchema = z.object({
  role_assignments: z.array(RoleIdSchema).optional(),
});

export type UserRolesDetailPatchDto = z.infer<typeof UserRolesDetailPatchSchema>;
