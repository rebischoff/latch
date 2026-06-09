import { ValidationError } from "@latch/contracts";
import type { FieldAction, FieldId } from "@latch/contracts";

import type { PolicyRegistry, SurfacePolicyDefinition } from "./registry.js";

/** One grant tuple validated at role-editor write time (P6). */
export type GrantTuple = {
  surfaceId: string;
  fieldId: FieldId | null;
  action: FieldAction;
};

const assertKnownAction = (
  action: string,
  allowed: readonly FieldAction[],
  label: string,
): void => {
  if (!allowed.includes(action as FieldAction)) {
    throw new ValidationError(`Unknown ${label} action: ${action}`);
  }
};

/**
 * Reject grants outside the codegen vocabulary catalog (decision 4 / invariant 3).
 * Unknown surface/field/action → ValidationError (4xx), not strip.
 */
export const validateGrantAgainstCatalog = (
  grant: Pick<GrantTuple, "fieldId" | "action">,
  surfaceDef: SurfacePolicyDefinition,
): void => {
  if (grant.fieldId === null) {
    assertKnownAction(grant.action, surfaceDef.surfaceActions, "surface");
    return;
  }

  if (!surfaceDef.fieldIds.includes(grant.fieldId)) {
    throw new ValidationError(`Unknown field: ${grant.fieldId}`);
  }

  assertKnownAction(grant.action, surfaceDef.fieldActions, "field");
};

/** Resolve `surfaceId` in the registry; reject IAM-surface grants for app-role configuration. */
export const resolveGrantSurfaceDef = (
  surfaceId: string,
  registry: PolicyRegistry,
  opts: { allowIamSurfaces?: boolean } = {},
): SurfacePolicyDefinition => {
  const surfaceDef = registry[surfaceId];
  if (!surfaceDef) {
    throw new ValidationError(`Unknown surface: ${surfaceId}`);
  }

  if (!opts.allowIamSurfaces && surfaceDef.kind === "iam") {
    throw new ValidationError(`Cannot grant on IAM surface: ${surfaceId}`);
  }

  return surfaceDef;
};

/** Validate a full grant tuple (surface + field/action) against the registry catalog. */
export const validateGrantTuple = (
  grant: GrantTuple,
  registry: PolicyRegistry,
  opts: { allowIamSurfaces?: boolean } = {},
): void => {
  const surfaceDef = resolveGrantSurfaceDef(grant.surfaceId, registry, opts);
  validateGrantAgainstCatalog(grant, surfaceDef);
};
