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
  SiteDetailCreateSchema,
  siteDetailDescriptor,
  type SiteDetailRow,
} from "../descriptors/site-detail";
import { insertSite, loadSiteDetail } from "../repository";

export const parseSiteCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof SiteDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(SiteDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const createSiteRowFromBody = (
  id: string,
  body: z.infer<typeof SiteDetailCreateSchema>,
): SiteDetailRow => ({
  id,
  name: body.profile.name,
  customer_party_id: body.customer_party?.customer_party_id ?? null,
  customer_display_name: null,
});

export const extendSiteDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  siteDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...siteDetailBaseDal,
  patch: async (ctx, id, body) => {
    await siteDetailBaseDal.patch(ctx, id, body);
    return siteDetailBaseDal.get(ctx, id);
  },
  create: async (ctx, id, body) => {
    const input = parseSiteCreateBody(ctx, body);

    if (await loadSiteDetail(pool, id)) {
      throw new ConflictError("Site already exists");
    }

    const row = createSiteRowFromBody(id, input);
    const actorId = await getActorId();
    await insertSite(pool, actorId, row, input.contacts);

    const fieldIds = ["profile"];
    if (input.customer_party !== undefined) {
      fieldIds.push("customer_party");
    }
    if (input.contacts !== undefined) {
      fieldIds.push("contacts");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: siteDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: siteDetailDescriptor.auditSnapshot(row),
    });

    return siteDetailBaseDal.get(ctx, id);
  },
});
