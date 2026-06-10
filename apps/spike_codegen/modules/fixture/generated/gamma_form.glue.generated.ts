// DO NOT EDIT — generated from gamma_form.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  GammaFormPatchSchema,
} from "./gamma_form.schema.generated.js";

export type GammaFormRow = {
  approver: string;
  justification: string;
  request_type: string;
};

const formatGammaFormRow = (row: GammaFormRow): Record<string, unknown> => ({
  approver: row.approver,
  justification: row.justification,
  request_type: row.request_type,
});

export const projectGammaFormRow = (
  row: GammaFormRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.request_type?.includes("read")) {
    dto.request_type = { request_type: row.request_type };
  }
  if (manifest.fields.justification?.includes("read")) {
    dto.justification = { justification: row.justification };
  }
  if (manifest.fields.approver?.includes("read")) {
    dto.approver = { approver: row.approver };
  }
  return dto;
};

export const applyGammaFormPatch = (
  row: GammaFormRow,
  patch: Record<string, unknown>,
): GammaFormRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof GammaFormPatchSchema>;

  if (typed.request_type?.request_type !== undefined) {
    next.request_type = typed.request_type.request_type;
  }
  if (typed.justification?.justification !== undefined) {
    next.justification = typed.justification.justification;
  }
  if (typed.approver?.approver !== undefined) {
    next.approver = typed.approver.approver;
  }
  return next;
};

export const gammaFormDescriptor: SurfaceDescriptor<GammaFormRow> = {
  surfaceId: "gamma_form",
  anchorTable: "fixture_gamma",
  capabilities: ["detail"],
  patchSchema: GammaFormPatchSchema,
  deleteAuditFieldId: "request_type",
  projectRow: projectGammaFormRow,
  applyPatch: applyGammaFormPatch,
  auditSnapshot: formatGammaFormRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
