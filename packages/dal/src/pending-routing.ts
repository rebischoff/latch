import {
  fieldAllows,
  ForbiddenError,
  type FieldId,
  type PermissionContext,
} from "@latch/contracts";

import { patchedFieldIds } from "./patch-utils.js";

export type SplitVerificationPatchResult = {
  directPatch: Record<string, unknown>;
  pendingPatch: Record<string, unknown>;
  pendingFieldIds: FieldId[];
};

/**
 * Hybrid verification routing: Fields in `verificationFieldIds` with `write` stay
 * on the direct path; `submit` ∧ ¬`write` → pending bundle; otherwise forbidden.
 */
export const splitVerificationPatch = (
  ctx: PermissionContext,
  patch: Record<string, unknown>,
  verificationFieldIds: readonly FieldId[] | undefined,
): SplitVerificationPatchResult => {
  if (!verificationFieldIds?.length) {
    return { directPatch: { ...patch }, pendingPatch: {}, pendingFieldIds: [] };
  }

  const verificationSet = new Set<string>(verificationFieldIds);
  const directPatch = { ...patch };
  const pendingPatch: Record<string, unknown> = {};
  const pendingFieldIds: FieldId[] = [];

  for (const fieldId of patchedFieldIds(patch)) {
    if (!verificationSet.has(fieldId)) {
      continue;
    }

    if (fieldAllows(ctx.manifest, fieldId, "write")) {
      continue;
    }

    if (fieldAllows(ctx.manifest, fieldId, "submit")) {
      pendingPatch[fieldId] = patch[fieldId];
      delete directPatch[fieldId];
      pendingFieldIds.push(fieldId as FieldId);
      continue;
    }

    throw new ForbiddenError();
  }

  return { directPatch, pendingPatch, pendingFieldIds };
};

/**
 * T10 — verification Fields must not hit live rows unless manifest grants `write`
 * or the caller is the `acceptPending` applier path.
 */
export const assertVerificationDirectWrite = (
  ctx: PermissionContext,
  directPatch: Record<string, unknown>,
  verificationFieldIds: readonly FieldId[] | undefined,
  options: { applier?: boolean } = {},
): void => {
  if (options.applier || !verificationFieldIds?.length) {
    return;
  }

  for (const fieldId of patchedFieldIds(directPatch)) {
    if (!verificationFieldIds.includes(fieldId as FieldId)) {
      continue;
    }
    if (!fieldAllows(ctx.manifest, fieldId, "write")) {
      throw new ForbiddenError();
    }
  }
};
