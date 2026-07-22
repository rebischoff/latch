import { ValidationError } from "@latch/contracts";

/**
 * Catalog write guard (task 61): material_phase_id must be one of the item's
 * resolved labor-phase ids (own + inherited), or null/cleared.
 */
export const assertMaterialPhaseAllowed = (
  materialPhaseId: string | null | undefined,
  allowedPhaseIds: ReadonlySet<string> | readonly string[],
  field = "commercial",
): void => {
  if (materialPhaseId == null || materialPhaseId === "") {
    return;
  }
  const allowed =
    allowedPhaseIds instanceof Set
      ? allowedPhaseIds
      : new Set(allowedPhaseIds);
  if (!allowed.has(materialPhaseId)) {
    throw new ValidationError(
      "material_phase_id must be one of the item's resolved labor phases",
      {
        field,
        code: "invalid_material_phase",
        material_phase_id: materialPhaseId,
      },
    );
  }
};

/**
 * Job-line write guard (task 61): override must match a seeded scope_phase on
 * that line (via labor_phase_id), or be cleared.
 */
export const assertJobLineMaterialPhaseAllowed = (
  materialPhaseId: string | null | undefined,
  lineScopePhaseIds: ReadonlySet<string> | readonly string[],
  jobLineId: string,
): void => {
  if (materialPhaseId == null || materialPhaseId === "") {
    return;
  }
  const allowed =
    lineScopePhaseIds instanceof Set
      ? lineScopePhaseIds
      : new Set(lineScopePhaseIds);
  if (!allowed.has(materialPhaseId)) {
    throw new ValidationError(
      "material_phase_id must match a scope_phase on this job line",
      {
        field: "line_items",
        code: "invalid_material_phase",
        job_line_id: jobLineId,
        material_phase_id: materialPhaseId,
      },
    );
  }
};

/** True when unlocking material_locked (true → false). */
export const isMaterialUnlock = (
  priorLocked: boolean | undefined,
  nextLocked: boolean | undefined,
): boolean => priorLocked === true && nextLocked === false;
