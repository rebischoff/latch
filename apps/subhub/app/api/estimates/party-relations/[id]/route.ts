import { jsonSuccess } from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../../../lib/api-handler";
import { ensureEstimatesDal } from "../../../../../lib/estimates/dal";
import { resolveContext, resolveContextFresh } from "../../../../../lib/latch";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

const surfaceId = "job_party_relation_table" as const;

export const GET = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const { id } = await context.params;
    const ctx = await resolveContext({ surfaceId, entityId: id });
    assertSurfaceRead(ctx);
    const dal = await ensureEstimatesDal();
    const data = await dal.jobPartyRelationTable.get(ctx, id);
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
    const dal = await ensureEstimatesDal();
    const data = await dal.jobPartyRelationTable.patch(ctx, id, body);
    return jsonSuccess(data, ctx.manifest);
  });

export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const { id } = await context.params;
    const ctx = await resolveContextFresh({ surfaceId, entityId: id });
    const dal = await ensureEstimatesDal();
    await dal.jobPartyRelationTable.delete(ctx, id);
    return new Response(null, { status: 204 });
  });
