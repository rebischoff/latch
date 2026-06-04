import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { createMemoryPendingStore } from "@latch/approval";
import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "@latch/audit";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";

import { createSurfaceDal } from "./create-surface-dal.js";
import { assertVerificationDirectWrite } from "./pending-routing.js";
import type { StoreAdapter } from "./store-adapter.js";
import type { SurfaceDescriptor } from "./surface-descriptor.js";

type WidgetChild = { widgetId: string; tag: string };

type WidgetRow = {
  id: string;
  label: string;
  notes: string | null;
  secret: string | null;
  status: string;
};

const WIDGET_ALPHA = "widget-alpha";
const WIDGET_BETA = "widget-beta";
const PRINCIPAL_A = "principal-a";
const PRINCIPAL_B = "principal-b";

const WidgetPatchSchema = z.object({
  label: z.object({ text: z.string().optional() }).optional(),
  meta: z.object({ notes: z.string().nullable().optional() }).optional(),
});

const WidgetListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

const formatWidgetRow = (row: WidgetRow) => ({
  label: row.label,
  notes: row.notes,
  secret: row.secret,
  status: row.status,
});

const widgetDeleteAuditSnapshot = (
  row: WidgetRow,
  children: WidgetChild[],
): Record<string, unknown> => ({
  ...formatWidgetRow(row),
  children: children.map((c) => ({ widget_id: c.widgetId, tag: c.tag })),
});

const widgetVerificationDescriptor: SurfaceDescriptor<WidgetRow, WidgetChild[]> =
  {
    surfaceId: "alpha_detail",
    anchorTable: "widgets",
    capabilities: ["detail"],
    patchSchema: WidgetPatchSchema,
    deleteAuditFieldId: "label",
    verificationFieldIds: ["meta"],
    projectRow: (row, manifest) => {
      const dto: Record<string, unknown> = { id: row.id };
      if (manifest.fields.label?.includes("read")) {
        dto.label = { text: row.label };
      }
      if (manifest.fields.meta?.includes("read")) {
        dto.meta = { notes: row.notes };
      }
      return dto;
    },
    applyPatch: (row, patch) => {
      const next = { ...row };
      const typed = patch as z.infer<typeof WidgetPatchSchema>;
      if (typed.label?.text !== undefined) {
        next.label = typed.label.text;
      }
      if (typed.meta?.notes !== undefined) {
        next.notes = typed.meta.notes;
      }
      return next;
    },
    auditSnapshot: formatWidgetRow,
    deleteAuditSnapshot: widgetDeleteAuditSnapshot,
    canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
  };

const widgetDetailDescriptor: SurfaceDescriptor<WidgetRow, WidgetChild[]> = {
  surfaceId: "alpha_detail",
  anchorTable: "widgets",
  capabilities: ["detail"],
  patchSchema: WidgetPatchSchema,
  deleteAuditFieldId: "label",
  projectRow: (row, manifest) => {
    const dto: Record<string, unknown> = { id: row.id };
    if (manifest.fields.label?.includes("read")) {
      dto.label = { text: row.label };
    }
    if (manifest.fields.meta?.includes("read")) {
      dto.meta = { notes: row.notes };
    }
    return dto;
  },
  applyPatch: (row, patch) => {
    const next = { ...row };
    const typed = patch as z.infer<typeof WidgetPatchSchema>;
    if (typed.label?.text !== undefined) {
      next.label = typed.label.text;
    }
    if (typed.meta?.notes !== undefined) {
      next.notes = typed.meta.notes;
    }
    return next;
  },
  auditSnapshot: formatWidgetRow,
  deleteAuditSnapshot: widgetDeleteAuditSnapshot,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

const widgetListDescriptor: SurfaceDescriptor<WidgetRow, WidgetChild[]> = {
  surfaceId: "alpha_list",
  anchorTable: "widgets",
  capabilities: ["list"],
  patchSchema: WidgetPatchSchema,
  listQuerySchema: WidgetListQuerySchema,
  listDefaultPageSize: 10,
  bulkMaxBatch: 5,
  deleteAuditFieldId: "label",
  projectRow: (row, manifest) => {
    const dto: Record<string, unknown> = { id: row.id };
    if (manifest.fields.label?.includes("read")) {
      dto.label = { text: row.label };
    }
    return dto;
  },
  applyPatch: widgetDetailDescriptor.applyPatch,
  auditSnapshot: formatWidgetRow,
  deleteAuditSnapshot: widgetDeleteAuditSnapshot,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};

class WidgetMemoryStore implements StoreAdapter<WidgetRow, WidgetChild[]> {
  readonly rows = new Map<string, WidgetRow>();
  readonly visibility = new Map<string, Set<string>>();
  readonly childrenByWidget = new Map<string, WidgetChild[]>();

  clear = (): void => {
    this.rows.clear();
    this.visibility.clear();
    this.childrenByWidget.clear();
  };

  seed = (): void => {
    this.rows.set(WIDGET_ALPHA, {
      id: WIDGET_ALPHA,
      label: "Alpha",
      notes: "note-a",
      secret: "hidden-a",
      status: "open",
    });
    this.rows.set(WIDGET_BETA, {
      id: WIDGET_BETA,
      label: "Beta",
      notes: "note-b",
      secret: "hidden-b",
      status: "closed",
    });
    this.visibility.set(WIDGET_ALPHA, new Set([PRINCIPAL_A]));
    this.visibility.set(WIDGET_BETA, new Set([PRINCIPAL_B]));
    this.childrenByWidget.set(WIDGET_ALPHA, [
      { widgetId: WIDGET_ALPHA, tag: "alpha-tag-1" },
      { widgetId: WIDGET_ALPHA, tag: "alpha-tag-2" },
    ]);
    this.childrenByWidget.set(WIDGET_BETA, []);
  };

  get = (id: string): WidgetRow | undefined => this.rows.get(id);

  list = (query: {
    principalId: string;
    rowScope: "own" | "all";
    status?: string;
    limit: number;
    offset: number;
  }) => {
    let rows = [...this.rows.values()];
    if (query.rowScope === "own") {
      rows = rows.filter((row) =>
        this.visibility.get(row.id)?.has(query.principalId),
      );
    }
    if (query.status !== undefined) {
      rows = rows.filter((row) => row.status === query.status);
    }
    const total = rows.length;
    return { rows: rows.slice(query.offset, query.offset + query.limit), total };
  };

  upsert = (row: WidgetRow): void => {
    this.rows.set(row.id, row);
  };

  delete = (id: string): void => {
    this.rows.delete(id);
    this.visibility.delete(id);
  };

  getRelated = (entityId: string): WidgetChild[] =>
    this.childrenByWidget.get(entityId) ?? [];

  replaceRelated = (): void => {};

  isRowVisibleToPrincipal = (
    entityId: string,
    principalId: string,
    rowScope: "own" | "all" | undefined,
  ): boolean => {
    if (rowScope !== "own") {
      return true;
    }
    return this.visibility.get(entityId)?.has(principalId) ?? false;
  };
}

const readOnlyManifest: Manifest = {
  surface: "alpha_detail",
  actions: ["read"],
  fields: {
    label: ["read"],
    meta: ["read"],
  },
};

const readLabelOnlyManifest: Manifest = {
  surface: "alpha_detail",
  actions: ["read"],
  fields: {
    label: ["read"],
  },
};

const writeManifest: Manifest = {
  surface: "alpha_detail",
  actions: ["read", "write"],
  fields: {
    label: ["read", "write"],
    meta: ["read", "write"],
  },
};

const listWriteManifest: Manifest = {
  surface: "alpha_list",
  actions: ["read", "write", "delete"],
  rowScope: "all",
  fields: {
    label: ["read", "write"],
  },
};

const ownScopeListManifest: Manifest = {
  surface: "alpha_list",
  actions: ["read", "write"],
  rowScope: "own",
  fields: {
    label: ["read", "write"],
  },
};

const buildCtx = (
  manifest: Manifest,
  principalId: string,
): PermissionContext => ({
  principal: { id: principalId, roles: ["fixture"] },
  manifest,
  surface: manifest.surface,
});

const audit = createMemoryAuditWriter();

afterEach(() => {
  audit.reset();
  setAuditWriter(null);
});

describe("createSurfaceDal (fixture descriptor)", () => {
  it("omits forbidden fields from projection", () => {
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetDetailDescriptor, store);

    const dto = dal.get(buildCtx(readLabelOnlyManifest, PRINCIPAL_A), WIDGET_ALPHA);

    expect(dto.label).toEqual({ text: "Alpha" });
    expect(dto).not.toHaveProperty("meta");
  });

  it("strict PATCH rejects unknown keys", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetDetailDescriptor, store);
    const ctx = buildCtx(writeManifest, PRINCIPAL_A);

    await expect(
      dal.patch(ctx, WIDGET_ALPHA, {
        label: { text: "Ok" },
        evil: true,
      }),
    ).rejects.toThrow(ValidationError);

    expect(audit.entries).toHaveLength(0);
  });

  it("cross-principal read throws NotFoundError under own row scope", () => {
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetDetailDescriptor, store);
    const ownManifest: Manifest = {
      ...readOnlyManifest,
      rowScope: "own",
    };

    expect(() =>
      dal.get(buildCtx(ownManifest, PRINCIPAL_A), WIDGET_BETA),
    ).toThrow(NotFoundError);
  });

  it("patch updates row and records audit", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetDetailDescriptor, store);
    const ctx = buildCtx(writeManifest, PRINCIPAL_A);

    const dto = await dal.patch(ctx, WIDGET_ALPHA, {
      label: { text: "Alpha updated" },
    });

    expect(dto.label).toEqual({ text: "Alpha updated" });
    expect(store.get(WIDGET_ALPHA)?.label).toBe("Alpha updated");
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: "update",
      tableName: "widgets",
      recordId: WIDGET_ALPHA,
      moduleId: "alpha_detail",
      fieldIds: ["label"],
    });
  });

  it("delete removes row and writes audit", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const detailDal = createSurfaceDal(widgetDetailDescriptor, store);
    const deleteManifest: Manifest = {
      ...writeManifest,
      actions: ["read", "write", "delete"],
    };
    const ctx = buildCtx(deleteManifest, PRINCIPAL_A);

    await detailDal.delete(ctx, WIDGET_ALPHA);

    expect(store.get(WIDGET_ALPHA)).toBeUndefined();
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: "delete",
      tableName: "widgets",
      after: null,
      fieldIds: ["label"],
    });
    expect(audit.entries[0]?.before).not.toHaveProperty("children");
  });

  it("delete with restore embeds CASCADE children in before snapshot", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const detailDal = createSurfaceDal(widgetDetailDescriptor, store);
    const restoreDeleteManifest: Manifest = {
      ...writeManifest,
      actions: ["read", "write", "delete", "restore"],
    };
    const ctx = buildCtx(restoreDeleteManifest, PRINCIPAL_A);
    const expectedChildren = store.getRelated(WIDGET_ALPHA);

    await detailDal.delete(ctx, WIDGET_ALPHA);

    expect(audit.entries).toHaveLength(1);
    const before = audit.entries[0]?.before as {
      children?: { widget_id: string; tag: string }[];
    };
    expect(before?.children).toHaveLength(expectedChildren.length);
    expect(before?.children).toEqual(
      expectedChildren.map((c) => ({ widget_id: c.widgetId, tag: c.tag })),
    );
  });

  it("delete throws ForbiddenError when not granted and writes no audit", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetDetailDescriptor, store);

    await expect(
      dal.delete(buildCtx(writeManifest, PRINCIPAL_A), WIDGET_ALPHA),
    ).rejects.toThrow(ForbiddenError);

    expect(store.get(WIDGET_ALPHA)).toBeDefined();
    expect(audit.entries).toHaveLength(0);
  });

  it("delete on missing row throws NotFoundError and writes no audit", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetDetailDescriptor, store);
    const deleteManifest: Manifest = {
      ...writeManifest,
      actions: ["read", "write", "delete"],
    };

    await expect(
      dal.delete(buildCtx(deleteManifest, PRINCIPAL_A), "missing-widget"),
    ).rejects.toThrow(NotFoundError);

    expect(audit.entries.filter((e) => e.action === "delete")).toHaveLength(0);
  });
});

describe("createSurfaceDal list + bulk (fixture descriptor)", () => {
  it("list respects own row scope", () => {
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetListDescriptor, store);

    const { rows, total } = dal.list!(
      buildCtx(ownScopeListManifest, PRINCIPAL_A),
    );

    expect(total).toBe(1);
    expect(rows[0]?.id).toBe(WIDGET_ALPHA);
  });

  it("bulkUpdate partial success with not_found skips", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetListDescriptor, store);

    const result = await dal.bulkUpdate!(
      buildCtx(listWriteManifest, PRINCIPAL_A),
      [WIDGET_ALPHA, "missing-1"],
      { label: { text: "Bulk alpha" } },
      { mode: "partial" },
    );

    expect(result.succeeded).toEqual([WIDGET_ALPHA]);
    expect(result.skipped).toEqual([{ id: "missing-1", reason: "not_found" }]);
    expect(store.get(WIDGET_ALPHA)?.label).toBe("Bulk alpha");
    expect(audit.entries.filter((e) => e.action === "update")).toHaveLength(1);
  });

  it("bulkDelete removes rows with audit per entity_id and bulk_summary when requestId set", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetListDescriptor, store);
    const ids = [WIDGET_ALPHA, WIDGET_BETA];

    const result = await dal.bulkDelete!(
      buildCtx(listWriteManifest, PRINCIPAL_A),
      ids,
      { mode: "partial", requestId: "fixture-bulk-del" },
    );

    expect(result.succeeded).toEqual(ids);
    expect(store.get(WIDGET_ALPHA)).toBeUndefined();
    expect(store.get(WIDGET_BETA)).toBeUndefined();

    const deleteEntries = audit.entries.filter((e) => e.action === "delete");
    expect(deleteEntries).toHaveLength(2);
    expect(deleteEntries.map((e) => e.recordId).sort()).toEqual([...ids].sort());
    for (const entry of deleteEntries) {
      expect(entry).toMatchObject({
        action: "delete",
        tableName: "widgets",
        moduleId: "alpha_list",
        after: null,
        requestId: "fixture-bulk-del",
      });
      expect(entry.before).toBeTruthy();
    }

    expect(audit.entries.some((e) => e.action === "bulk_summary")).toBe(true);
  });

  it("bulkDelete skips not_found without delete audit for skipped ids", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetListDescriptor, store);
    const missingId = "missing-widget";

    const result = await dal.bulkDelete!(
      buildCtx(listWriteManifest, PRINCIPAL_A),
      [WIDGET_ALPHA, missingId],
      { mode: "partial" },
    );

    expect(result.succeeded).toEqual([WIDGET_ALPHA]);
    expect(result.skipped).toEqual([{ id: missingId, reason: "not_found" }]);

    const deleteEntries = audit.entries.filter((e) => e.action === "delete");
    expect(deleteEntries).toHaveLength(1);
    expect(deleteEntries[0]?.recordId).toBe(WIDGET_ALPHA);
  });

  it("bulkDelete without delete grant throws ForbiddenError and writes no audit", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetListDescriptor, store);
    const readOnlyList: Manifest = {
      ...listWriteManifest,
      actions: ["read", "write"],
    };

    await expect(
      dal.bulkDelete!(buildCtx(readOnlyList, PRINCIPAL_A), [WIDGET_ALPHA]),
    ).rejects.toThrow(ForbiddenError);

    expect(store.get(WIDGET_ALPHA)).toBeDefined();
    expect(audit.entries).toHaveLength(0);
  });
});

const submitMetaManifest: Manifest = {
  surface: "alpha_detail",
  actions: ["read"],
  fields: {
    label: ["read", "write"],
    meta: ["read", "submit"],
  },
};

const approveMetaManifest: Manifest = {
  surface: "alpha_detail",
  actions: ["read"],
  fields: {
    label: ["read"],
    meta: ["read", "approve"],
  },
};

const readOnlyMetaManifest: Manifest = {
  surface: "alpha_detail",
  actions: ["read"],
  fields: {
    label: ["read", "write"],
    meta: ["read"],
  },
};

describe("createSurfaceDal verification pending routing", () => {
  it("routes submit-only verification Field to pending; live row unchanged", async () => {
    const store = new WidgetMemoryStore();
    store.seed();
    const pendingStore = createMemoryPendingStore();
    const dal = createSurfaceDal(widgetVerificationDescriptor, store, {
      pendingStore,
    });

    const dto = await dal.patch(
      buildCtx(submitMetaManifest, PRINCIPAL_A),
      WIDGET_ALPHA,
      { meta: { notes: "proposed" } },
    );

    expect(store.get(WIDGET_ALPHA)?.notes).toBe("note-a");
    expect(dto.meta).toEqual({ notes: "note-a" });

    const pending = await pendingStore.getPendingForEntity(WIDGET_ALPHA, {
      surfaceId: "alpha_detail",
      status: "submitted",
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]?.patch).toEqual({ meta: { notes: "proposed" } });
  });

  it("second submit while open pending throws ConflictError", async () => {
    const store = new WidgetMemoryStore();
    store.seed();
    const pendingStore = createMemoryPendingStore();
    const dal = createSurfaceDal(widgetVerificationDescriptor, store, {
      pendingStore,
    });
    const ctx = buildCtx(submitMetaManifest, PRINCIPAL_A);

    await dal.patch(ctx, WIDGET_ALPHA, { meta: { notes: "first" } });

    await expect(
      dal.patch(ctx, WIDGET_ALPHA, { meta: { notes: "second" } }),
    ).rejects.toThrow(ConflictError);
  });

  it("hybrid patch: verification Field pending + other Fields apply live", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const pendingStore = createMemoryPendingStore();
    const dal = createSurfaceDal(widgetVerificationDescriptor, store, {
      pendingStore,
    });

    await dal.patch(buildCtx(submitMetaManifest, PRINCIPAL_A), WIDGET_ALPHA, {
      label: { text: "Alpha live" },
      meta: { notes: "pending only" },
    });

    expect(store.get(WIDGET_ALPHA)?.label).toBe("Alpha live");
    expect(store.get(WIDGET_ALPHA)?.notes).toBe("note-a");
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]?.fieldIds).toEqual(["label"]);
  });

  it("acceptPending applies verification Field via applier path", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const pendingStore = createMemoryPendingStore();
    const dal = createSurfaceDal(widgetVerificationDescriptor, store, {
      pendingStore,
    });

    await dal.patch(buildCtx(submitMetaManifest, PRINCIPAL_A), WIDGET_ALPHA, {
      meta: { notes: "approved notes" },
    });

    const pending = await pendingStore.getPendingForEntity(WIDGET_ALPHA, {
      status: "submitted",
    });
    const dto = await dal.acceptPending!(
      buildCtx(approveMetaManifest, PRINCIPAL_B),
      pending[0]!.id,
    );

    expect(dto.meta).toEqual({ notes: "approved notes" });
    expect(store.get(WIDGET_ALPHA)?.notes).toBe("approved notes");
    expect(audit.entries[0]?.action).toBe("approve");
  });

  it("rejectPending leaves verification Field unchanged and audits reject", async () => {
    setAuditWriter(audit.writer);
    const store = new WidgetMemoryStore();
    store.seed();
    const pendingStore = createMemoryPendingStore();
    const dal = createSurfaceDal(widgetVerificationDescriptor, store, {
      pendingStore,
    });

    await dal.patch(buildCtx(submitMetaManifest, PRINCIPAL_A), WIDGET_ALPHA, {
      meta: { notes: "rejected notes" },
    });

    const pending = await pendingStore.getPendingForEntity(WIDGET_ALPHA, {
      status: "submitted",
    });

    await dal.rejectPending!(
      buildCtx(approveMetaManifest, PRINCIPAL_B),
      pending[0]!.id,
    );

    expect(store.get(WIDGET_ALPHA)?.notes).toBe("note-a");
    expect((await pendingStore.getById(pending[0]!.id))?.status).toBe("rejected");
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]?.action).toBe("reject");
  });

  it("withdrawPending allows resubmit without audit row", async () => {
    const store = new WidgetMemoryStore();
    store.seed();
    const pendingStore = createMemoryPendingStore();
    const dal = createSurfaceDal(widgetVerificationDescriptor, store, {
      pendingStore,
    });
    const submitCtx = buildCtx(submitMetaManifest, PRINCIPAL_A);

    await dal.patch(submitCtx, WIDGET_ALPHA, {
      meta: { notes: "withdraw me" },
    });

    const first = await pendingStore.getPendingForEntity(WIDGET_ALPHA, {
      status: "submitted",
    });
    await dal.withdrawPending!(submitCtx, first[0]!.id);

    await dal.patch(submitCtx, WIDGET_ALPHA, {
      meta: { notes: "resubmitted" },
    });

    const open = await pendingStore.getPendingForEntity(WIDGET_ALPHA, {
      status: "submitted",
    });
    expect(open).toHaveLength(1);
    expect(open[0]?.id).not.toBe(first[0]!.id);
  });
});

describe("T10 verification direct-write guard", () => {
  it("submit-only verification patch without pending store throws ForbiddenError", async () => {
    const store = new WidgetMemoryStore();
    store.seed();
    const dal = createSurfaceDal(widgetVerificationDescriptor, store);

    await expect(
      dal.patch(buildCtx(submitMetaManifest, PRINCIPAL_A), WIDGET_ALPHA, {
        meta: { notes: "blocked" },
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("direct write to verification Field without write or applier throws ForbiddenError", () => {
    expect(() =>
      assertVerificationDirectWrite(
        buildCtx(readOnlyMetaManifest, PRINCIPAL_A),
        { meta: { notes: "blocked" } },
        ["meta"],
      ),
    ).toThrow(ForbiddenError);
  });

  it("applier path allows verification Field without manifest write", () => {
    expect(() =>
      assertVerificationDirectWrite(
        buildCtx(approveMetaManifest, PRINCIPAL_B),
        { meta: { notes: "ok" } },
        ["meta"],
        { applier: true },
      ),
    ).not.toThrow();
  });
});
