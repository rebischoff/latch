// DO NOT EDIT — generated from beta_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  BetaDetailPatchSchema,
} from "./beta_detail.schema.generated.js";

export type BetaDetailRow = {
  assignee: string;
  body: string;
  due_date: string;
  headline: string;
  priority: number;
  review_notes: string;
};

const formatBetaDetailRow = (row: BetaDetailRow): Record<string, unknown> => ({
  assignee: row.assignee,
  body: row.body,
  due_date: row.due_date,
  headline: row.headline,
  priority: row.priority,
  review_notes: row.review_notes,
});

export const projectBetaDetailRow = (
  row: BetaDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.headline?.includes("read")) {
    dto.headline = { headline: row.headline };
  }
  if (manifest.fields.body?.includes("read")) {
    dto.body = { body: row.body };
  }
  if (manifest.fields.priority?.includes("read")) {
    dto.priority = { priority: row.priority };
  }
  if (manifest.fields.due_date?.includes("read")) {
    dto.due_date = { due_date: row.due_date };
  }
  if (manifest.fields.assignee?.includes("read")) {
    dto.assignee = { assignee: row.assignee };
  }
  if (manifest.fields.review_notes?.includes("read")) {
    dto.review_notes = { review_notes: row.review_notes };
  }
  return dto;
};

export const applyBetaDetailPatch = (
  row: BetaDetailRow,
  patch: Record<string, unknown>,
): BetaDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof BetaDetailPatchSchema>;

  if (typed.headline?.headline !== undefined) {
    next.headline = typed.headline.headline;
  }
  if (typed.body?.body !== undefined) {
    next.body = typed.body.body;
  }
  if (typed.priority?.priority !== undefined) {
    next.priority = typed.priority.priority;
  }
  if (typed.due_date?.due_date !== undefined) {
    next.due_date = typed.due_date.due_date;
  }
  if (typed.assignee?.assignee !== undefined) {
    next.assignee = typed.assignee.assignee;
  }
  if (typed.review_notes?.review_notes !== undefined) {
    next.review_notes = typed.review_notes.review_notes;
  }
  return next;
};

export const betaDetailDescriptor: SurfaceDescriptor<BetaDetailRow> = {
  surfaceId: "beta_detail",
  anchorTable: "fixture_beta",
  capabilities: ["detail"],
  patchSchema: BetaDetailPatchSchema,
  deleteAuditFieldId: "headline",
  projectRow: projectBetaDetailRow,
  applyPatch: applyBetaDetailPatch,
  auditSnapshot: formatBetaDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
