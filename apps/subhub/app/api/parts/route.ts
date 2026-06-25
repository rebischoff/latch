import { jsonSuccess, parseOffsetLimitQuery, withApiHandler } from "@latch/app-kit";
import { randomUUID } from "node:crypto";

import { withSubhubApiHandler } from "../../../lib/api-handler";
import { resolveContextFresh } from "../../../lib/latch";
import { ensurePartsDal } from "../../../lib/parts/dal";
import { assertSurfaceRead } from "../../../lib/surfaces/assert-surface-read";
import { loadSurfaceListQuery } from "../../../lib/surfaces/load-surface-list";

const parsePartListQuery = (request: Request): Record<string, unknown> | undefined => {
  const base = parseOffsetLimitQuery(request) ?? {};
  const q = new URL(request.url).searchParams.get("q");
  if (q !== null) {
    base.q = q;
  }
  return Object.keys(base).length > 0 ? base : undefined;
};

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const query = parsePartListQuery(request);
    const { data, manifest } = await loadSurfaceListQuery("part_list", query);
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
      surfaceId: "part_detail",
      entityId: id,
    });
    assertSurfaceRead(ctx);
    const dal = await ensurePartsDal();
    const data = await dal.partDetail.create(ctx, id, body);
    return jsonSuccess(data, ctx.manifest);
  });
