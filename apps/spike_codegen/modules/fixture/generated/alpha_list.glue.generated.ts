// DO NOT EDIT — generated from alpha_list.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  AlphaListPatchSchema,
} from "./alpha_list.schema.generated.js";


export const AlphaListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type AlphaListRow = {
  category: string;
  owner: string;
  status: string;
  title: string;
};

const formatAlphaListRow = (row: AlphaListRow): Record<string, unknown> => ({
  category: row.category,
  owner: row.owner,
  status: row.status,
  title: row.title,
});

export const projectAlphaListRow = (
  row: AlphaListRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.title?.includes("read")) {
    dto.title = { title: row.title };
  }
  if (manifest.fields.status?.includes("read")) {
    dto.status = { status: row.status };
  }
  if (manifest.fields.owner?.includes("read")) {
    dto.owner = { owner: row.owner };
  }
  if (manifest.fields.category?.includes("read")) {
    dto.category = { category: row.category };
  }
  return dto;
};

export const applyAlphaListPatch = (
  row: AlphaListRow,
  patch: Record<string, unknown>,
): AlphaListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof AlphaListPatchSchema>;

  if (typed.title?.title !== undefined) {
    next.title = typed.title.title;
  }
  if (typed.status?.status !== undefined) {
    next.status = typed.status.status;
  }
  if (typed.owner?.owner !== undefined) {
    next.owner = typed.owner.owner;
  }
  if (typed.category?.category !== undefined) {
    next.category = typed.category.category;
  }
  return next;
};

export const alphaListDescriptor: SurfaceDescriptor<AlphaListRow> = {
  surfaceId: "alpha_list",
  anchorTable: "fixture_alpha",
  capabilities: ["list"],
  patchSchema: AlphaListPatchSchema,
  listQuerySchema: AlphaListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "title",
  projectRow: projectAlphaListRow,
  applyPatch: applyAlphaListPatch,
  auditSnapshot: formatAlphaListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
