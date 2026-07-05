import { writeAudit } from "@latch/audit";
import {
  ConflictError,
  ForbiddenError,
  narrowPatchSchema,
  surfaceAllows,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import type { SurfaceDal } from "@latch/dal";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool } from "pg";
import { z } from "zod";

import {
  CategoryDetailCreateSchema,
  categoryDetailDescriptor,
  type CategoryDetailWriteRow,
} from "../descriptors/category-detail";
import { loadCategoryDetail } from "../repository/category-detail";
import { loadAllCategories, resolveRootCategoryId } from "../repository/category-tree";
import { applyCategorySpecParticipationTx } from "../repository/category-spec-participation-write";
import { applyCategorySpecDefinitionsTx } from "../repository/spec-def-write";
import { insertCategory } from "../repository/category-write";

export const parseCategoryCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof CategoryDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(CategoryDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const createCategoryRowFromBody = (
  id: string,
  body: z.infer<typeof CategoryDetailCreateSchema>,
): CategoryDetailWriteRow => ({
  id,
  name: body.profile.name,
  parent_id: body.profile.parent_id ?? null,
  sort_order: body.profile.sort_order ?? 0,
  csi_code: body.profile.csi_code ?? null,
  default_phase_template_id: body.profile.parent_id
    ? null
    : (body.profile.default_phase_template_id ?? null),
});

const applySpecParticipationCreate = async (
  pool: Pool,
  actorId: string,
  categoryId: string,
  isRoot: boolean,
  specParticipation: NonNullable<
    z.infer<typeof CategoryDetailCreateSchema>["spec_participation"]
  >,
): Promise<void> => {
  const allRows = await loadAllCategories(pool);
  const rootCategoryId = isRoot ? categoryId : resolveRootCategoryId(allRows, categoryId);
  if (!rootCategoryId) {
    return;
  }

  await withPermissionDb(pool, actorId, async (client) => {
    await applyCategorySpecParticipationTx(
      client,
      categoryId,
      rootCategoryId,
      specParticipation.participates,
      allRows,
    );
  });
};

export const extendCategoryDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  categoryDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...categoryDetailBaseDal,
  patch: async (ctx, id, body) => {
    const existing = await loadCategoryDetail(pool, id);
    if (!existing) {
      return categoryDetailBaseDal.get(ctx, id);
    }

    await categoryDetailBaseDal.patch(ctx, id, body);
    return categoryDetailBaseDal.get(ctx, id);
  },
  create: async (ctx, id, body) => {
    const input = parseCategoryCreateBody(ctx, body);

    if (await loadCategoryDetail(pool, id)) {
      throw new ConflictError("Category already exists");
    }

    const row = createCategoryRowFromBody(id, input);
    const actorId = await getActorId();
    await insertCategory(pool, actorId, row);

    if (input.spec_definitions !== undefined) {
      const created = await loadCategoryDetail(pool, id);
      if (created) {
        await withPermissionDb(pool, actorId, async (client) => {
          await applyCategorySpecDefinitionsTx(client, created, input.spec_definitions!);
        });
      }
    }

    if (input.spec_participation !== undefined) {
      await applySpecParticipationCreate(
        pool,
        actorId,
        id,
        row.parent_id === null,
        input.spec_participation,
      );
    }

    const fieldIds = ["profile"];
    if (input.spec_definitions !== undefined) {
      fieldIds.push("spec_definitions");
    }
    if (input.spec_participation !== undefined) {
      fieldIds.push("spec_participation");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: categoryDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: categoryDetailDescriptor.auditSnapshot({
        ...row,
        is_root: row.parent_id === null,
        parent_name: null,
        root_category_id: row.parent_id === null ? row.id : null,
        root_category_name: null,
      }),
    });

    return categoryDetailBaseDal.get(ctx, id);
  },
});
