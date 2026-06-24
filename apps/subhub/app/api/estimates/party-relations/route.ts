import { jsonSuccess } from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../../lib/api-handler";
import { ensureEstimatesDal } from "../../../../lib/estimates/dal";
import { resolveContext, resolveContextFresh } from "../../../../lib/latch";
import { assertSurfaceRead } from "../../../../lib/surfaces/assert-surface-read";

const surfaceId = "job_party_relation_table" as const;

export const GET = async (): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId });
    assertSurfaceRead(ctx);
    const dal = await ensureEstimatesDal();
    const { rows, total } = await dal.jobPartyRelationTable.listAll(ctx);
    return jsonSuccess({ rows, total }, ctx.manifest);
  });

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({ surfaceId });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const dal = await ensureEstimatesDal();
    const data = await dal.jobPartyRelationTable.create(ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });

export const PATCH = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({ surfaceId });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const dal = await ensureEstimatesDal();
    const data = await dal.jobPartyRelationTable.replace(ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });
