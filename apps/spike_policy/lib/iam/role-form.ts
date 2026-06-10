import type { RoleDetailPatchDto } from "../../modules/iam/generated/role_detail.schema.generated.js";
import type { GrantMatrixSurface } from "../grant-matrix-vocabulary.js";
import type { ProjectedRoleDetail } from "./project.js";

export type RoleFormSurfaceState = {
  bound: boolean;
  rowScope: "own" | "all" | null;
  fieldGrants: Record<string, Record<string, boolean>>;
  surfaceActions: Record<string, boolean>;
};

export type RoleFormValues = {
  displayName: string;
  surfaces: Record<string, RoleFormSurfaceState>;
};

export const buildDefaultRoleFormValues = (
  vocabulary: GrantMatrixSurface[],
): RoleFormValues => ({
  displayName: "",
  surfaces: Object.fromEntries(
    vocabulary.map((surface) => [
      surface.surfaceId,
      {
        bound: false,
        rowScope: null,
        fieldGrants: Object.fromEntries(
          surface.fieldIds.map((fieldId) => [
            fieldId,
            Object.fromEntries(
              surface.fieldActions.map((action) => [action, false]),
            ),
          ]),
        ),
        surfaceActions: Object.fromEntries(
          surface.surfaceActions.map((action) => [action, false]),
        ),
      },
    ]),
  ),
});

export const roleDetailToFormValues = (
  role: ProjectedRoleDetail,
  vocabulary: GrantMatrixSurface[],
): RoleFormValues => {
  const defaults = buildDefaultRoleFormValues(vocabulary);
  defaults.displayName = role.catalog?.display_name ?? "";

  const bindingBySurface = new Map(
    (role.surface_bindings ?? []).map((binding) => [
      binding.surface_id,
      binding.row_scope,
    ]),
  );

  for (const surface of vocabulary) {
    const rowScope = bindingBySurface.get(surface.surfaceId);
    const surfaceState = defaults.surfaces[surface.surfaceId];
    if (!surfaceState) {
      continue;
    }
    surfaceState.bound = rowScope !== undefined;
    surfaceState.rowScope = rowScope ?? null;
  }

  for (const grant of role.grants ?? []) {
    const surfaceState = defaults.surfaces[grant.surface_id];
    if (!surfaceState) {
      continue;
    }
    if (grant.field_id === null) {
      surfaceState.surfaceActions[grant.action] = true;
      continue;
    }
    const fieldGrants = surfaceState.fieldGrants[grant.field_id];
    if (fieldGrants) {
      fieldGrants[grant.action] = true;
    }
  }

  return defaults;
};

export const roleFormValuesToPatch = (
  values: RoleFormValues,
  vocabulary: GrantMatrixSurface[],
): RoleDetailPatchDto => {
  const surface_bindings = vocabulary
    .filter((surface) => values.surfaces[surface.surfaceId]?.bound)
    .map((surface) => ({
      surface_id: surface.surfaceId,
      row_scope: values.surfaces[surface.surfaceId]!.rowScope,
    }));

  const grants: RoleDetailPatchDto["grants"] = [];

  for (const surface of vocabulary) {
    const surfaceState = values.surfaces[surface.surfaceId];
    if (!surfaceState?.bound) {
      continue;
    }

    for (const [action, checked] of Object.entries(surfaceState.surfaceActions)) {
      if (checked) {
        grants.push({
          surface_id: surface.surfaceId,
          field_id: null,
          action,
        });
      }
    }

    for (const fieldId of surface.fieldIds) {
      const actionMap = surfaceState.fieldGrants[fieldId] ?? {};
      for (const [action, checked] of Object.entries(actionMap)) {
        if (checked) {
          grants.push({
            surface_id: surface.surfaceId,
            field_id: fieldId,
            action,
          });
        }
      }
    }
  }

  return {
    catalog: { display_name: values.displayName },
    surface_bindings,
    grants,
  };
};
