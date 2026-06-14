// DO NOT EDIT — generated from contact_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  ContactDetailPatchSchema,
} from "./contact_detail.schema.generated.js";

export type ContactDetailRow = {
  display_name: string;
  id: string;
  kind: string;
  legal_name: string | null;
  notes: string | null;
};

const formatContactDetailRow = (row: ContactDetailRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  kind: row.kind,
  legal_name: row.legal_name,
  notes: row.notes,
});

export const projectContactDetailRow = (
  row: ContactDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, kind: row.kind, display_name: row.display_name, legal_name: row.legal_name, notes: row.notes };
  }
  return dto;
};

export const applyContactDetailPatch = (
  row: ContactDetailRow,
  patch: Record<string, unknown>,
): ContactDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ContactDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.kind !== undefined) {
    next.kind = typed.profile.kind;
  }
  if (typed.profile?.display_name !== undefined) {
    next.display_name = typed.profile.display_name;
  }
  if (typed.profile?.legal_name !== undefined) {
    next.legal_name = typed.profile.legal_name;
  }
  if (typed.profile?.notes !== undefined) {
    next.notes = typed.profile.notes;
  }
  return next;
};

export const contactDetailDescriptor: SurfaceDescriptor<ContactDetailRow> = {
  surfaceId: "contact_detail",
  anchorTable: "party",
  capabilities: ["detail"],
  patchSchema: ContactDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectContactDetailRow,
  applyPatch: applyContactDetailPatch,
  auditSnapshot: formatContactDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
