import { jsonSuccess, withPendingApiHandler } from "@/lib/api/pending-handler";
import { requireSession } from "@/lib/auth/requireSession";
import { getJobsDal } from "@/lib/latch";
import { resolveJobDetailPendingById } from "@/lib/pending-api";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = async (
  _request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withPendingApiHandler(async () => {
    await requireSession();
    const { id } = await params;
    const { ctx } = await resolveJobDetailPendingById(id);
    await getJobsDal().withdrawPending(ctx, id);
    return jsonSuccess({ ok: true }, ctx.manifest);
  });
