import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError, ValidationError } from "@latch/contracts";
import { z } from "zod";

import {
  createProposedRootSiteZone,
  listRootSiteZonesForSite,
} from "../../../../../lib/estimates/repository/estimate-site-tree";
import { assertSiteExists } from "../../../../../lib/estimates/repository/estimate-write";
import { getPool, getPrincipal, resolveContext } from "../../../../../lib/latch";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

const CreateProposedRootZoneSchema = z
  .object({
    site_id: z.string().min(1),
    root_item_id: z.string().min(1),
    name: z.string().min(1).optional(),
  })
  .strict();

const assertConditionsAccess = (
  manifest: Parameters<typeof fieldAllows>[0],
): void => {
  const canAccess =
    fieldAllows(manifest, "conditions", "read") ||
    fieldAllows(manifest, "conditions", "write");
  if (!canAccess) {
    throw new ForbiddenError();
  }
};

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    assertSurfaceRead(ctx);
    assertConditionsAccess(ctx.manifest);

    const siteId = new URL(request.url).searchParams.get("site_id")?.trim();
    if (!siteId) {
      throw new ValidationError("site_id is required", {
        field: "site_id",
        code: "required",
      });
    }

    const pool = getPool();
    await assertSiteExists(pool, siteId);
    const rows = await listRootSiteZonesForSite(pool, siteId);

    return jsonSuccess({ rows, total: rows.length }, ctx.manifest);
  });

export const POST = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "estimate_detail" });
    if (!fieldAllows(ctx.manifest, "conditions", "write")) {
      throw new ForbiddenError();
    }

    const parsed = CreateProposedRootZoneSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten());
    }

    const principal = await getPrincipal();
    const row = await createProposedRootSiteZone(getPool(), principal.id, {
      siteId: parsed.data.site_id,
      rootItemId: parsed.data.root_item_id,
      name: parsed.data.name,
    });

    return jsonSuccess({ row }, ctx.manifest);
  });
