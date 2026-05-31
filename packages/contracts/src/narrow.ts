import { z } from "zod";

import type { FieldAction, FieldId, Manifest } from "./types.js";

export const fieldAllows = (
  manifest: Manifest,
  fieldId: FieldId,
  action: FieldAction,
): boolean => manifest.fields[fieldId]?.includes(action) ?? false;

export const surfaceAllows = (
  manifest: Manifest,
  action: FieldAction,
): boolean => manifest.actions.includes(action);

/** Field ids with `read` in the manifest. */
export const readableFieldIds = (manifest: Manifest): FieldId[] =>
  Object.keys(manifest.fields).filter((id) =>
    fieldAllows(manifest, id, "read"),
  );

/** Field ids with `write` in the manifest. */
export const writableFieldIds = (manifest: Manifest): FieldId[] =>
  Object.keys(manifest.fields).filter((id) =>
    fieldAllows(manifest, id, "write"),
  );

/** Field ids with `submit` in the manifest (approval-gated propose). */
export const submittableFieldIds = (manifest: Manifest): FieldId[] =>
  Object.keys(manifest.fields).filter((id) =>
    fieldAllows(manifest, id, "submit"),
  );

/** Field ids allowed in a PATCH body (`write` or `submit`). */
export const patchableFieldIds = (manifest: Manifest): FieldId[] => {
  const ids = new Set<FieldId>([
    ...writableFieldIds(manifest),
    ...submittableFieldIds(manifest),
  ]);
  return [...ids];
};

/**
 * Narrow a base Zod object to fields allowed by the manifest.
 * Write mode returns a `.strict()` schema (unknown keys rejected).
 */
export const narrowSchema = <T extends z.ZodRawShape>(
  base: z.ZodObject<T>,
  manifest: Manifest,
  mode: "read" | "write",
) => {
  const action: FieldAction = mode === "read" ? "read" : "write";
  const allowed = Object.keys(manifest.fields).filter((id) =>
    fieldAllows(manifest, id, action),
  );

  const shape = base.shape;
  const pickMask: Record<string, true> = {};

  for (const key of allowed) {
    if (key in shape) {
      pickMask[key] = true;
    }
  }

  const picked = base.pick(pickMask as z.util.Exactly<{ [K in keyof T]?: true }, never>);
  return mode === "write" ? picked.strict() : picked;
};

/**
 * Narrow a PATCH schema to fields with `write` or `submit`.
 * Always `.strict()` — unknown keys rejected (T1).
 */
export const narrowPatchSchema = <T extends z.ZodRawShape>(
  base: z.ZodObject<T>,
  manifest: Manifest,
) => {
  const allowed = patchableFieldIds(manifest);
  const shape = base.shape;
  const pickMask: Record<string, true> = {};

  for (const key of allowed) {
    if (key in shape) {
      pickMask[key] = true;
    }
  }

  return base.pick(pickMask as z.util.Exactly<{ [K in keyof T]?: true }, never>).strict();
};
