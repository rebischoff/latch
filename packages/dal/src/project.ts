import type { Manifest } from "@latch/contracts";

import type { SurfaceDescriptor } from "./surface-descriptor";

/**
 * Build a Field-keyed DTO from a store row using the surface descriptor.
 * Forbidden Fields are omitted entirely (not set to `null`).
 */
export const projectRow = <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  row: TRow,
  manifest: Manifest,
  related: TRelated,
  listJoins?: Record<string, unknown>,
): Record<string, unknown> =>
  descriptor.projectRow(row, manifest, related, listJoins);
