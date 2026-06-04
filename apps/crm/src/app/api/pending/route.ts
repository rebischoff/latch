import { jsonSuccess, withPendingApiHandler } from "@/lib/api/pending-handler";
import { requireSession } from "@/lib/auth/requireSession";
import {
  assertJobDetailSurfaceQuery,
  listJobDetailPendingForEntity,
  parsePendingStatusFilter,
} from "@/lib/pending-api";
import { ValidationError } from "@latch/contracts";

export const GET = async (request: Request): Promise<Response> =>
  withPendingApiHandler(async () => {
    await requireSession();

    const url = new URL(request.url);
    const surface = url.searchParams.get("surface");
    const entityId = url.searchParams.get("entity_id");
    const status = parsePendingStatusFilter(url.searchParams.get("status"));

    if (!entityId) {
      throw new ValidationError("Query parameter entity_id is required");
    }

    assertJobDetailSurfaceQuery(surface);

    const { ctx, items } = await listJobDetailPendingForEntity(entityId, status);
    return jsonSuccess(items, ctx.manifest);
  });
