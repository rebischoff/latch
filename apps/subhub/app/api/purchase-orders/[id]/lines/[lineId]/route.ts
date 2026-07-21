import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows, ValidationError } from "@latch/contracts";
import { z } from "zod";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { updatePurchaseOrderLineDescription } from "@/lib/purchase-orders/repository";

type RouteContext = { params: Promise<{ id: string; lineId: string }> };

const PatchSchema = z
  .object({
    description: z.string(),
  })
  .strict();

/** IT6 override: purchaser edits the seeded PO line description while draft. */
export const PATCH = async (
  request: Request,
  routeContext: RouteContext,
): Promise<Response> =>
  withApiHandler(async () => {
    const { id, lineId } = await routeContext.params;
    const ctx = await resolveContextFresh({
      surfaceId: "purchase_order_detail",
      entityId: id,
    });

    if (!surfaceAllows(ctx.manifest, "write")) {
      throw new ForbiddenError();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body", { code: "invalid_json" });
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid line patch payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    await updatePurchaseOrderLineDescription(
      getPool(),
      ctx.principal.id,
      id,
      lineId,
      parsed.data.description,
    );
    return jsonSuccess({ ok: true }, ctx.manifest);
  });
