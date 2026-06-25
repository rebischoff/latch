import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";
import { randomUUID } from "node:crypto";

import { withSubhubApiHandler } from "../../../lib/api-handler";
import { ensureJobsDal } from "../../../lib/jobs/dal";
import { resolveContextFresh } from "../../../lib/latch";
import { assertSurfaceRead } from "../../../lib/surfaces/assert-surface-read";
import { loadSurfaceListQuery } from "../../../lib/surfaces/load-surface-list";

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const query = parseOffsetLimitQuery(request);
    const { data, manifest } = await loadSurfaceListQuery("job_list", query);
    return jsonSuccess(data, manifest);
  });

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const raw: unknown = await request.json();
    const id =
      typeof raw === "object" &&
      raw !== null &&
      "id" in raw &&
      typeof (raw as { id: unknown }).id === "string"
        ? (raw as { id: string }).id
        : randomUUID();
    const body =
      typeof raw === "object" && raw !== null
        ? (() => {
            const { id: _id, ...rest } = raw as Record<string, unknown>;
            return rest;
          })()
        : raw;

    const ctx = await resolveContextFresh({
      surfaceId: "job_detail",
      entityId: id,
    });
    assertSurfaceRead(ctx);
    const dal = await ensureJobsDal();
    const data = await dal.jobDetail.create(ctx, id, body);
    return jsonSuccess(data, ctx.manifest);
  });
