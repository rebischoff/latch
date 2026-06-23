import { jsonSuccess } from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../../../lib/api-handler";
import { resolveContext, resolveContextFresh } from "../../../../../lib/latch";
import { ensureSitesDal } from "../../../../../lib/sites/dal";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

const surfaceId = "site_contact_relation_table" as const;

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const { id } = await context.params;
    const ctx = await resolveContext({ surfaceId, entityId: id });
    assertSurfaceRead(ctx);
    const dal = await ensureSitesDal();
    const data = await dal.siteContactRelationTable.get(ctx, id);
    return jsonSuccess(data, ctx.manifest);
  });

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const { id } = await context.params;
    const ctx = await resolveContextFresh({ surfaceId, entityId: id });
    const body: unknown = await request.json();
    const dal = await ensureSitesDal();
    const data = await dal.siteContactRelationTable.patch(ctx, id, body);
    return jsonSuccess(data, ctx.manifest);
  });

export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const { id } = await context.params;
    const ctx = await resolveContextFresh({ surfaceId, entityId: id });
    const dal = await ensureSitesDal();
    await dal.siteContactRelationTable.delete(ctx, id);
    return new Response(null, { status: 204 });
  });
