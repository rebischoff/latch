/** Field ids present in a parsed PATCH body (top-level keys only). */
export const patchedFieldIds = (patch: Record<string, unknown>): string[] =>
  Object.keys(patch);
