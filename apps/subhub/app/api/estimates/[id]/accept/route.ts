import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows, ValidationError } from "@latch/contracts";
import { z } from "zod";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { acceptEstimate } from "@/lib/estimates/repository";

type RouteContext = { params: Promise<{ id: string }> };

const AcceptRequestSchema = z
  .object({
    proceedDespiteActiveSiteJobs: z.boolean().optional(),
  })
  .strict();

export const POST = async (
  request: Request,
  routeContext: RouteContext,
): Promise<Response> =>
  withApiHandler(async () => {
    const { id: estimateId } = await routeContext.params;
    const ctx = await resolveContextFresh({
      surfaceId: "estimate_detail",
      entityId: estimateId,
    });

    if (!surfaceAllows(ctx.manifest, "accept")) {
      throw new ForbiddenError();
    }

    let body: unknown = {};
    const raw = await request.text();
    if (raw.trim().length > 0) {
      try {
        body = JSON.parse(raw);
      } catch {
        throw new ValidationError("Invalid JSON body", { code: "invalid_json" });
      }
    }

    const parsed = AcceptRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid accept payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const pool = getPool();
    const result = await acceptEstimate(
      pool,
      ctx.principal.id,
      estimateId,
      parsed.data,
    );
    return jsonSuccess(result, ctx.manifest);
  });
