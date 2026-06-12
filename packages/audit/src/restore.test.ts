import { afterEach, describe, expect, it } from "vitest";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  principalWithRoles,
  ValidationError,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";

import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "./audit-service.js";
import type { AuditJson } from "./types.js";
import { restoreFromAuditEntry, type StoredAuditEntry } from "./restore.js";

const WIDGET_ID = "widget-alpha";
const PRINCIPAL = "principal-restore";

const restoreManifest: Manifest = {
  surface: "alpha_detail",
  actions: ["read", "restore"],
  fields: { label: ["read"] },
};

const noRestoreManifest: Manifest = {
  surface: "alpha_detail",
  actions: ["read", "delete"],
  fields: { label: ["read"] },
};

const buildCtx = (manifest: Manifest): PermissionContext => ({
  principal: principalWithRoles(PRINCIPAL, ["admin"]),
  manifest,
  surface: "alpha_detail",
});

type WidgetBefore = {
  label: string;
  status: string;
  children?: { widget_id: string; tag: string }[];
};

describe("restoreFromAuditEntry", () => {
  const audit = createMemoryAuditWriter();
  const catalog = new Map<string, StoredAuditEntry>();
  const liveRows = new Map<string, WidgetBefore>();

  const deleteEntry: StoredAuditEntry = {
    id: "audit-delete-1",
    actorId: "other-user",
    action: "delete",
    tableName: "widgets",
    recordId: WIDGET_ID,
    moduleId: "alpha_detail",
    fieldIds: ["label"],
    before: {
      label: "Alpha",
      status: "open",
      children: [
        { widget_id: WIDGET_ID, tag: "tag-a" },
        { widget_id: WIDGET_ID, tag: "tag-b" },
      ],
    },
    after: null,
  };

  afterEach(() => {
    audit.reset();
    catalog.clear();
    liveRows.clear();
    setAuditWriter(null);
  });

  const deps = () => ({
    getAuditEntry: (id: string) => catalog.get(id) ?? null,
    anchorExists: (_table: string, recordId: string) => liveRows.has(recordId),
    supportedEntityTypes: ["widgets"],
    replay: ({
      recordId,
      before,
    }: {
      tableName: string;
      recordId: string;
      before: AuditJson;
    }) => {
      const snapshot = before as WidgetBefore;
      const anchor = {
        label: snapshot.label,
        status: snapshot.status,
      };
      liveRows.set(recordId, {
        ...anchor,
        children: snapshot.children ?? [],
      });
      return anchor;
    },
  });

  it("replays delete before: anchor + children visible; restore audit row", async () => {
    setAuditWriter(audit.writer);
    catalog.set(deleteEntry.id, deleteEntry);

    await restoreFromAuditEntry(
      deleteEntry.id,
      buildCtx(restoreManifest),
      deps(),
    );

    expect(liveRows.get(WIDGET_ID)).toMatchObject({
      label: "Alpha",
      status: "open",
      children: [
        { widget_id: WIDGET_ID, tag: "tag-a" },
        { widget_id: WIDGET_ID, tag: "tag-b" },
      ],
    });

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      actorId: PRINCIPAL,
      action: "restore",
      tableName: "widgets",
      recordId: WIDGET_ID,
      moduleId: "alpha_detail",
      before: null,
      after: { label: "Alpha", status: "open" },
    });
  });

  it("second restore of same entity → ConflictError", async () => {
    setAuditWriter(audit.writer);
    catalog.set(deleteEntry.id, deleteEntry);
    liveRows.set(WIDGET_ID, { label: "Alpha", status: "open" });

    await expect(
      restoreFromAuditEntry(deleteEntry.id, buildCtx(restoreManifest), deps()),
    ).rejects.toThrow(ConflictError);
  });

  it("principal without restore → ForbiddenError", async () => {
    catalog.set(deleteEntry.id, deleteEntry);

    await expect(
      restoreFromAuditEntry(
        deleteEntry.id,
        buildCtx(noRestoreManifest),
        deps(),
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("missing audit id → NotFoundError", async () => {
    await expect(
      restoreFromAuditEntry("missing", buildCtx(restoreManifest), deps()),
    ).rejects.toThrow(NotFoundError);
  });

  it("non-delete audit row → ValidationError", async () => {
    catalog.set("audit-update", {
      ...deleteEntry,
      id: "audit-update",
      action: "update",
      before: { label: "x" },
      after: { label: "y" },
    });

    await expect(
      restoreFromAuditEntry("audit-update", buildCtx(restoreManifest), deps()),
    ).rejects.toThrow(ValidationError);
  });
});
