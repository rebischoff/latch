import type { FieldAction } from "@latch/contracts";
import type { PolicyRegistry } from "@latch/policy";

export type GrantMatrixSurface = {
  surfaceId: string;
  fieldIds: readonly string[];
  fieldActions: readonly FieldAction[];
  surfaceActions: readonly FieldAction[];
};

/** Fixture business surfaces for the sparse allow-only grant matrix (excludes IAM surfaces). */
export const fixtureGrantMatrixSurfaces = (
  registry: PolicyRegistry,
): GrantMatrixSurface[] =>
  Object.values(registry)
    .filter((surface) => surface.kind !== "iam")
    .map((surface) => ({
      surfaceId: surface.surface,
      fieldIds: surface.fieldIds,
      fieldActions: surface.fieldActions,
      surfaceActions: surface.surfaceActions,
    }))
    .sort((a, b) => a.surfaceId.localeCompare(b.surfaceId));
