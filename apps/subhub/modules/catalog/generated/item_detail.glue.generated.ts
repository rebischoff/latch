// DO NOT EDIT — generated from item_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  ItemDetailPatchSchema,
} from "./item_detail.schema.generated";

export type ItemDetailRow = {
  csi_code: string | null;
  fallback_unit_cost: number;
  freight_rate_type_id: string | null;
  id: string;
  incidental_rate_type_id: string | null;
  markup_type_id: string | null;
  material_phase_id: string | null;
  name: string;
  node_type: string;
  parent_id: string | null;
  sort_order: number;
};

const formatItemDetailRow = (row: ItemDetailRow): Record<string, unknown> => ({
  csi_code: row.csi_code,
  fallback_unit_cost: row.fallback_unit_cost,
  freight_rate_type_id: row.freight_rate_type_id,
  id: row.id,
  incidental_rate_type_id: row.incidental_rate_type_id,
  markup_type_id: row.markup_type_id,
  material_phase_id: row.material_phase_id,
  name: row.name,
  node_type: row.node_type,
  parent_id: row.parent_id,
  sort_order: row.sort_order,
});

export const projectItemDetailRow = (
  row: ItemDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, name: row.name, parent_id: row.parent_id, node_type: row.node_type, sort_order: row.sort_order, csi_code: row.csi_code };
  }
  if (manifest.fields.commercial?.includes("read")) {
    dto.commercial = { freight_rate_type_id: row.freight_rate_type_id, incidental_rate_type_id: row.incidental_rate_type_id, markup_type_id: row.markup_type_id, fallback_unit_cost: row.fallback_unit_cost, material_phase_id: row.material_phase_id };
  }
  return dto;
};

export const applyItemDetailPatch = (
  row: ItemDetailRow,
  patch: Record<string, unknown>,
): ItemDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ItemDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.name !== undefined) {
    next.name = typed.profile.name;
  }
  if (typed.profile?.parent_id !== undefined) {
    next.parent_id = typed.profile.parent_id;
  }
  if (typed.profile?.node_type !== undefined) {
    next.node_type = typed.profile.node_type;
  }
  if (typed.profile?.sort_order !== undefined) {
    next.sort_order = typed.profile.sort_order;
  }
  if (typed.profile?.csi_code !== undefined) {
    next.csi_code = typed.profile.csi_code;
  }
  if (typed.commercial?.freight_rate_type_id !== undefined) {
    next.freight_rate_type_id = typed.commercial.freight_rate_type_id;
  }
  if (typed.commercial?.incidental_rate_type_id !== undefined) {
    next.incidental_rate_type_id = typed.commercial.incidental_rate_type_id;
  }
  if (typed.commercial?.markup_type_id !== undefined) {
    next.markup_type_id = typed.commercial.markup_type_id;
  }
  if (typed.commercial?.fallback_unit_cost !== undefined) {
    next.fallback_unit_cost = typed.commercial.fallback_unit_cost;
  }
  if (typed.commercial?.material_phase_id !== undefined) {
    next.material_phase_id = typed.commercial.material_phase_id;
  }
  return next;
};

export const itemDetailDescriptor: SurfaceDescriptor<ItemDetailRow> = {
  surfaceId: "item_detail",
  anchorTable: "item",
  capabilities: ["detail"],
  patchSchema: ItemDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectItemDetailRow,
  applyPatch: applyItemDetailPatch,
  auditSnapshot: formatItemDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
