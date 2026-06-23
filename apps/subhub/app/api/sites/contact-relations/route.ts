import { jsonSuccess } from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../../lib/api-handler";
import { resolveContext, resolveContextFresh } from "../../../../lib/latch";
import { assertSurfaceRead } from "../../../../lib/surfaces/assert-surface-read";
import { ensureSitesDal } from "../../../../lib/sites/dal";

const surfaceId = "site_contact_relation_table" as const;

export const GET = async (): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId });
    assertSurfaceRead(ctx);
    const dal = await ensureSitesDal();
    const { rows, total } = await dal.siteContactRelationTable.listAll(ctx);
    return jsonSuccess({ rows, total }, ctx.manifest);
  });

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({ surfaceId });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const dal = await ensureSitesDal();
    const data = await dal.siteContactRelationTable.create(ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });

export const PATCH = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({ surfaceId });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const dal = await ensureSitesDal();
    const data = await dal.siteContactRelationTable.replace(ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });
