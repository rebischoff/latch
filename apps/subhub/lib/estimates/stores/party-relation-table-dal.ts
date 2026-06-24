import { writeAudit } from "@latch/audit";
import {
  ForbiddenError,
  narrowPatchSchema,
  surfaceAllows,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import type { SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";
import { z } from "zod";

import {
  JobPartyRelationTableCreateSchema,
  JobPartyRelationTableReplaceSchema,
  jobPartyRelationTableDescriptor,
  type JobPartyRelationTableRow,
} from "../descriptors/party-relation-table";
import {
  insertJobPartyRelation,
  loadJobPartyRelationList,
  replaceJobPartyRelations,
} from "../repository";

const projectRow = (
  row: JobPartyRelationTableRow,
  manifest: PermissionContext["manifest"],
): Record<string, unknown> =>
  jobPartyRelationTableDescriptor.projectRow(row, manifest, {});

const parseCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): { display_name: string; sort_order: number } => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(
    JobPartyRelationTableCreateSchema,
    ctx.manifest,
  );
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  const typed = parsed.data as z.infer<typeof JobPartyRelationTableCreateSchema>;
  if (typed.display_name?.display_name === undefined) {
    throw new ValidationError("display_name is required");
  }

  return {
    display_name: typed.display_name.display_name,
    sort_order: typed.sort_order?.sort_order ?? 0,
  };
};

const parseReplaceBody = (
  ctx: PermissionContext,
  body: unknown,
): Array<{ display_name: string; id?: string }> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  if (!ctx.manifest.fields.display_name?.includes("write")) {
    throw new ForbiddenError();
  }

  const parsed = JobPartyRelationTableReplaceSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data.rows;
};

const rowsEqual = (
  left: JobPartyRelationTableRow,
  right: JobPartyRelationTableRow,
): boolean =>
  left.display_name === right.display_name && left.sort_order === right.sort_order;

export type JobPartyRelationTableDal = SurfaceDal & {
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

export const extendJobPartyRelationTableDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  jobPartyRelationTableBaseDal: SurfaceDal,
): JobPartyRelationTableDal => {
  const listAll: JobPartyRelationTableDal["listAll"] = async (ctx) => {
    const rows = await loadJobPartyRelationList(pool);
    return {
      rows: rows.map((row) => projectRow(row, ctx.manifest)),
      total: rows.length,
    };
  };

  const create: JobPartyRelationTableDal["create"] = async (ctx, body) => {
    const input = parseCreateBody(ctx, body);
    const actorId = await getActorId();
    const row = await insertJobPartyRelation(pool, actorId, input);

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: jobPartyRelationTableDescriptor.anchorTable,
      recordId: row.id,
      moduleId: ctx.surface,
      fieldIds: ["display_name", "sort_order"],
      before: null,
      after: jobPartyRelationTableDescriptor.auditSnapshot(row),
    });

    return projectRow(row, ctx.manifest);
  };

  const replace: JobPartyRelationTableDal["replace"] = async (ctx, body) => {
    const before = await loadJobPartyRelationList(pool);
    const parsedRows = parseReplaceBody(ctx, body);
    const beforeById = new Map(before.map((row) => [row.id, row]));

    const keepIds = new Set(
      parsedRows
        .map((row) => row.id)
        .filter((id): id is string => id !== undefined),
    );
    const hasDeletes = before.some((row) => !keepIds.has(row.id));
    if (hasDeletes && !surfaceAllows(ctx.manifest, "delete")) {
      throw new ForbiddenError();
    }

    const orderWritable = ctx.manifest.fields.sort_order?.includes("write") ?? false;

    const input = parsedRows.map((row, index) => ({
      id: row.id,
      display_name: row.display_name,
      sort_order: orderWritable
        ? index + 1
        : (row.id ? beforeById.get(row.id)?.sort_order : undefined) ?? index + 1,
    }));

    const actorId = await getActorId();
    const after = await replaceJobPartyRelations(pool, actorId, input);
    const afterById = new Map(after.map((row) => [row.id, row]));

    for (const [id, row] of beforeById) {
      if (!afterById.has(id)) {
        await writeAudit({
          actorId: ctx.principal.id,
          action: "delete",
          tableName: jobPartyRelationTableDescriptor.anchorTable,
          recordId: id,
          moduleId: ctx.surface,
          fieldIds: ["display_name", "sort_order"],
          before: jobPartyRelationTableDescriptor.auditSnapshot(row),
          after: null,
        });
      }
    }

    for (const row of after) {
      const previous = beforeById.get(row.id);
      if (!previous) {
        await writeAudit({
          actorId: ctx.principal.id,
          action: "insert",
          tableName: jobPartyRelationTableDescriptor.anchorTable,
          recordId: row.id,
          moduleId: ctx.surface,
          fieldIds: ["display_name", "sort_order"],
          before: null,
          after: jobPartyRelationTableDescriptor.auditSnapshot(row),
        });
        continue;
      }

      if (!rowsEqual(previous, row)) {
        await writeAudit({
          actorId: ctx.principal.id,
          action: "update",
          tableName: jobPartyRelationTableDescriptor.anchorTable,
          recordId: row.id,
          moduleId: ctx.surface,
          fieldIds: ["display_name", "sort_order"],
          before: jobPartyRelationTableDescriptor.auditSnapshot(previous),
          after: jobPartyRelationTableDescriptor.auditSnapshot(row),
        });
      }
    }

    return {
      rows: after.map((row) => projectRow(row, ctx.manifest)),
      total: after.length,
    };
  };

  return {
    ...jobPartyRelationTableBaseDal,
    listAll,
    create,
    replace,
  };
};
