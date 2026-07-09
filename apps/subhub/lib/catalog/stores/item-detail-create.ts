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
  ItemDetailCreateSchema,
  itemDetailDescriptor,
  type ItemDetailWriteRow,
} from "../descriptors/item-detail";
import { loadItemDetail } from "../repository/item-detail";
import { applyCategorySpecParticipationTx } from "../repository/item-spec-participation-write";
import { loadAllItems, resolveRootItemId } from "../repository/item-tree";
import { insertItem, replaceItemLaborPhases } from "../repository/item-write";

export const parseCategoryCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof ItemDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(ItemDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const createCategoryRowFromBody = (
  id: string,
  body: z.infer<typeof ItemDetailCreateSchema>,
): ItemDetailWriteRow => ({
  id,
  name: body.profile.name,
  parent_id: body.profile.parent_id ?? null,
  node_type:
    body.profile.node_type ?? (body.profile.parent_id ? "category" : "scope"),
  sort_order: body.profile.sort_order ?? 0,
  csi_code: body.profile.csi_code ?? null,
  freight_rate_type_id: body.commercial?.freight_rate_type_id ?? null,
  incidental_rate_type_id: body.commercial?.incidental_rate_type_id ?? null,
  markup_type_id: body.commercial?.markup_type_id ?? null,
  fallback_unit_cost: body.commercial?.fallback_unit_cost ?? 0,
});

const applySpecParticipationCreate = async (
  pool: Pool,
  actorId: string,
  categoryId: string,
  isRoot: boolean,
  specParticipation: NonNullable<
    z.infer<typeof ItemDetailCreateSchema>["spec_participation"]
  >,
): Promise<void> => {
  const allRows = await loadAllItems(pool);
  const rootItemId = isRoot ? categoryId : resolveRootItemId(allRows, categoryId);
  if (!rootItemId) {
    return;
  }

  await withPermissionDb(pool, actorId, async (client) => {
    await applyCategorySpecParticipationTx(
      client,
      categoryId,
      rootItemId,
      specParticipation.participates,
    );
  });
};

export const extendItemDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  itemDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...itemDetailBaseDal,
  patch: async (ctx, id, body) => {
    const existing = await loadItemDetail(pool, id);
    if (!existing) {
      return itemDetailBaseDal.get(ctx, id);
    }

    await itemDetailBaseDal.patch(ctx, id, body);
    return itemDetailBaseDal.get(ctx, id);
  },
  create: async (ctx, id, body) => {
    const input = parseCategoryCreateBody(ctx, body);

    if (await loadItemDetail(pool, id)) {
      throw new ConflictError("Category already exists");
    }

    const row = createCategoryRowFromBody(id, input);
    const actorId = await getActorId();
    await insertItem(pool, actorId, row);

    if (input.spec_participation !== undefined) {
      await applySpecParticipationCreate(
        pool,
        actorId,
        id,
        row.parent_id === null,
        input.spec_participation,
      );
    }

    if (input.item_labor_phase !== undefined) {
      await withPermissionDb(pool, actorId, async (client) => {
        await replaceItemLaborPhases(
          client,
          id,
          input.item_labor_phase!.map((laborRow, index) => ({
            ...laborRow,
            sort_order: laborRow.sort_order ?? index + 1,
          })),
        );
      });
    }

    const fieldIds = ["profile"];
    if (input.commercial !== undefined) {
      fieldIds.push("commercial");
    }
    if (input.item_labor_phase !== undefined) {
      fieldIds.push("item_labor_phase");
    }
    if (input.spec_participation !== undefined) {
      fieldIds.push("spec_participation");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: itemDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: itemDetailDescriptor.auditSnapshot({
        ...row,
        is_root: row.parent_id === null,
        node_type: row.node_type,
        parent_name: null,
        root_item_id: row.parent_id === null ? row.id : null,
        root_item_name: null,
        fallback_unit_cost: row.fallback_unit_cost,
        has_children: false,
        in_use: false,
      }),
    });

    return itemDetailBaseDal.get(ctx, id);
  },
});
