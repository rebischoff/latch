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
import type { Pool } from "pg";
import { z } from "zod";

import {
  PartDetailCreateSchema,
  partDetailDescriptor,
  type PartDetailWriteRow,
} from "../descriptors/part-detail";
import { insertPart, loadPartDetail } from "../repository";

export const parsePartCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof PartDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(PartDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const createPartRowFromBody = (
  id: string,
  body: z.infer<typeof PartDetailCreateSchema>,
): PartDetailWriteRow => ({
  id,
  manufacturer_party_id: body.profile.manufacturer_party_id,
  mpn: body.profile.mpn,
  description: body.profile.description,
  unit: body.profile.unit ?? "ea",
  purchase_unit: body.profile.purchase_unit ?? null,
  units_per_purchase: body.profile.units_per_purchase ?? 1,
});

export const extendPartDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  partDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...partDetailBaseDal,
  patch: async (ctx, id, body) => {
    await partDetailBaseDal.patch(ctx, id, body);
    return partDetailBaseDal.get(ctx, id);
  },
  create: async (ctx, id, body) => {
    const input = parsePartCreateBody(ctx, body);

    if (await loadPartDetail(pool, id)) {
      throw new ConflictError("Part already exists");
    }

    const row = createPartRowFromBody(id, input);
    const actorId = await getActorId();
    await insertPart(pool, actorId, row, {
      vendor_pricing: input.vendor_pricing,
      item_links: input.item_links,
      part_specs: input.part_specs,
    });

    const fieldIds = ["profile"];
    if (input.vendor_pricing !== undefined) {
      fieldIds.push("vendor_pricing");
    }
    if (input.item_links !== undefined) {
      fieldIds.push("item_links");
    }
    if (input.part_specs !== undefined) {
      fieldIds.push("part_specs");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: partDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: partDetailDescriptor.auditSnapshot({
        ...row,
        manufacturer_display_name: "",
      }),
    });

    return partDetailBaseDal.get(ctx, id);
  },
});
