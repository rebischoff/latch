import { ValidationError } from "@latch/contracts";

import { jsonSuccess, withPendingApiHandler } from "@/lib/api/pending-handler";
import { requireSession } from "@/lib/auth/requireSession";
import { getJobsDal } from "@/lib/latch";
import { resolveJobDetailPendingById } from "@/lib/pending-api";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = async (
  request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withPendingApiHandler(async () => {
    await requireSession();
    const { id } = await params;
    const { ctx } = await resolveJobDetailPendingById(id);

    let comment: string | undefined;
    const raw = await request.text();
    if (raw.length > 0) {
      const body = JSON.parse(raw) as { comment?: unknown };
      if (body.comment !== undefined) {
        if (typeof body.comment !== "string") {
          throw new ValidationError("comment must be a string");
        }
        comment = body.comment;
      }
    }

    await getJobsDal().rejectPending(ctx, id, { comment });
    return jsonSuccess({ ok: true }, ctx.manifest);
  });
