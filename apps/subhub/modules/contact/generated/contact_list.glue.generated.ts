// DO NOT EDIT — generated from contact_list.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  ContactListPatchSchema,
} from "./contact_list.schema.generated";


export const ContactListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type ContactListRow = {
  display_name: string;
  id: string;
  kind: string;
};

const formatContactListRow = (row: ContactListRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  kind: row.kind,
});

export const projectContactListRow = (
  row: ContactListRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = { id: row.id, display_name: row.display_name, kind: row.kind };
  }
  return dto;
};

export const applyContactListPatch = (
  row: ContactListRow,
  patch: Record<string, unknown>,
): ContactListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ContactListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.display_name !== undefined) {
    next.display_name = typed.summary.display_name;
  }
  if (typed.summary?.kind !== undefined) {
    next.kind = typed.summary.kind;
  }
  return next;
};

export const contactListDescriptor: SurfaceDescriptor<ContactListRow> = {
  surfaceId: "contact_list",
  anchorTable: "party",
  capabilities: ["list"],
  patchSchema: ContactListPatchSchema,
  listQuerySchema: ContactListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectContactListRow,
  applyPatch: applyContactListPatch,
  auditSnapshot: formatContactListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
