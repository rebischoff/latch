import { z } from "zod";

import type { ProjectedUserRolesDetail } from "./project.js";

export const UserCreateSchema = z
  .object({
    id: z.string().trim().min(1, "User id is required"),
    display_name: z.string().trim().min(1, "Display name is required"),
    role_assignments: z.array(z.string().uuid()).optional(),
  })
  .strict();

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

export type UserCreateFormValues = {
  id: string;
  display_name: string;
  role_assignments: string[];
};

export const userCreateFormValuesToInput = (
  values: UserCreateFormValues,
): UserCreateInput => ({
  id: values.id.trim(),
  display_name: values.display_name.trim(),
  role_assignments:
    values.role_assignments.length > 0 ? values.role_assignments : undefined,
});

export type UserDetailFormValues = {
  display_name?: string;
  role_assignments: string[];
};

export const userDetailToFormValues = (
  user: ProjectedUserRolesDetail,
): UserDetailFormValues => ({
  display_name: user.profile?.display_name,
  role_assignments: user.role_assignments ?? [],
});

export const userFormValuesToPatch = (
  values: UserDetailFormValues,
): { role_assignments: string[] } => ({
  role_assignments: values.role_assignments,
});
