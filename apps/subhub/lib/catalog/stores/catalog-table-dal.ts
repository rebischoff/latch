import { writeAudit } from "@latch/audit";
import {
  ForbiddenError,
  surfaceAllows,
  ValidationError,
  type Manifest,
  type PermissionContext,
} from "@latch/contracts";
import type { SurfaceDal, SurfaceDescriptor } from "@latch/dal";
import type { Pool } from "pg";
import { z } from "zod";

type CatalogTableDalMethods = {
  listAll: (
    ctx: PermissionContext,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
  create: (
    ctx: PermissionContext,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
  replace: (
    ctx: PermissionContext,
    body: unknown,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

type CatalogTableDalOptions<TRow extends Record<string, unknown>> = {
  createSchema: z.ZodTypeAny;
  descriptor: SurfaceDescriptor<TRow>;
  insertRow: (
    pool: Pool,
    actorId: string,
    row: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  listRows: (pool: Pool) => Promise<Record<string, unknown>[]>;
  mapCreateBody: (body: unknown) => Record<string, unknown>;
  mapReplaceBody: (body: unknown) => Array<Record<string, unknown>>;
  replaceRows: (
    pool: Pool,
    actorId: string,
    rows: Array<Record<string, unknown>>,
  ) => Promise<Record<string, unknown>[]>;
};

const projectRows = <TRow extends Record<string, unknown>>(
  rows: TRow[],
  manifest: Manifest,
  descriptor: SurfaceDescriptor<TRow>,
): Record<string, unknown>[] =>
  rows.map((row) => descriptor.projectRow(row, manifest, {}));

export const extendCatalogTableDal = <TRow extends Record<string, unknown>>(
  pool: Pool,
  getActorId: () => Promise<string>,
  baseDal: SurfaceDal,
  options: CatalogTableDalOptions<TRow>,
): SurfaceDal & CatalogTableDalMethods => {
  const {
    createSchema,
    descriptor,
    insertRow,
    listRows,
    mapCreateBody,
    mapReplaceBody,
    replaceRows,
  } = options;

  const listAll: CatalogTableDalMethods["listAll"] = async (ctx) => {
    const rows = await listRows(pool);
    return {
      rows: projectRows(rows as TRow[], ctx.manifest, descriptor),
      total: rows.length,
    };
  };

  const create: CatalogTableDalMethods["create"] = async (ctx, body) => {
    if (!surfaceAllows(ctx.manifest, "write")) {
      throw new ForbiddenError();
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten());
    }

    const actorId = await getActorId();
    const row = await insertRow(pool, actorId, mapCreateBody(body));
    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: descriptor.anchorTable,
      recordId: String(row.id),
      moduleId: ctx.surface,
      fieldIds: Object.keys(row).filter((key) => key !== "id"),
      before: null,
      after: row,
    });

    return descriptor.projectRow(row as TRow, ctx.manifest, {});
  };

  const replace: CatalogTableDalMethods["replace"] = async (ctx, body) => {
    if (!surfaceAllows(ctx.manifest, "write")) {
      throw new ForbiddenError();
    }

    const before = await listRows(pool);
    const parsedRows = mapReplaceBody(body);
    const beforeById = new Map(before.map((row) => [String(row.id), row]));

    const keepIds = new Set(
      parsedRows
        .map((row) => row.id as string | undefined)
        .filter((id): id is string => id !== undefined),
    );
    const hasDeletes = before.some((row) => !keepIds.has(String(row.id)));
    if (hasDeletes && !surfaceAllows(ctx.manifest, "delete")) {
      throw new ForbiddenError();
    }

    const actorId = await getActorId();
    const after = await replaceRows(pool, actorId, parsedRows);
    const afterById = new Map(after.map((row) => [String(row.id), row]));

    for (const [id, row] of beforeById) {
      if (!afterById.has(id)) {
        await writeAudit({
          actorId: ctx.principal.id,
          action: "delete",
          tableName: descriptor.anchorTable,
          recordId: id,
          moduleId: ctx.surface,
          fieldIds: Object.keys(row).filter((key) => key !== "id"),
          before: row,
          after: null,
        });
      }
    }

    for (const row of after) {
      const id = String(row.id);
      const previous = beforeById.get(id);
      if (!previous) {
        await writeAudit({
          actorId: ctx.principal.id,
          action: "insert",
          tableName: descriptor.anchorTable,
          recordId: id,
          moduleId: ctx.surface,
          fieldIds: Object.keys(row).filter((key) => key !== "id"),
          before: null,
          after: row,
        });
      }
    }

    return {
      rows: projectRows(after as TRow[], ctx.manifest, descriptor),
      total: after.length,
    };
  };

  return {
    ...baseDal,
    listAll,
    create,
    replace,
  };
};
