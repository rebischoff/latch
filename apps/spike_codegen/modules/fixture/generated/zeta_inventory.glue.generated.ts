// DO NOT EDIT — generated from zeta_inventory.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  ZetaInventoryPatchSchema,
} from "./zeta_inventory.schema.generated.js";

export type ZetaInventoryRow = {
  location: string;
  quantity: number;
  reorder_level: number;
  sku: string;
  supplier: string;
};

const formatZetaInventoryRow = (row: ZetaInventoryRow): Record<string, unknown> => ({
  location: row.location,
  quantity: row.quantity,
  reorder_level: row.reorder_level,
  sku: row.sku,
  supplier: row.supplier,
});

export const projectZetaInventoryRow = (
  row: ZetaInventoryRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.sku?.includes("read")) {
    dto.sku = { sku: row.sku };
  }
  if (manifest.fields.quantity?.includes("read")) {
    dto.quantity = { quantity: row.quantity };
  }
  if (manifest.fields.location?.includes("read")) {
    dto.location = { location: row.location };
  }
  if (manifest.fields.reorder_level?.includes("read")) {
    dto.reorder_level = { reorder_level: row.reorder_level };
  }
  if (manifest.fields.supplier?.includes("read")) {
    dto.supplier = { supplier: row.supplier };
  }
  return dto;
};

export const applyZetaInventoryPatch = (
  row: ZetaInventoryRow,
  patch: Record<string, unknown>,
): ZetaInventoryRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ZetaInventoryPatchSchema>;

  if (typed.sku?.sku !== undefined) {
    next.sku = typed.sku.sku;
  }
  if (typed.quantity?.quantity !== undefined) {
    next.quantity = typed.quantity.quantity;
  }
  if (typed.location?.location !== undefined) {
    next.location = typed.location.location;
  }
  if (typed.reorder_level?.reorder_level !== undefined) {
    next.reorder_level = typed.reorder_level.reorder_level;
  }
  if (typed.supplier?.supplier !== undefined) {
    next.supplier = typed.supplier.supplier;
  }
  return next;
};

export const zetaInventoryDescriptor: SurfaceDescriptor<ZetaInventoryRow> = {
  surfaceId: "zeta_inventory",
  anchorTable: "fixture_zeta",
  capabilities: ["detail"],
  patchSchema: ZetaInventoryPatchSchema,
  deleteAuditFieldId: "sku",
  projectRow: projectZetaInventoryRow,
  applyPatch: applyZetaInventoryPatch,
  auditSnapshot: formatZetaInventoryRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
