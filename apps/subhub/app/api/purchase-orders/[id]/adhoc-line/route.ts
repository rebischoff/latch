import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows, ValidationError } from "@latch/contracts";
import { z } from "zod";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { addAdHocPurchaseOrderLine } from "@/lib/purchase-orders/repository";

type RouteContext = { params: Promise<{ id: string }> };

const AdHocSchema = z
  .object({
    description: z.string().optional(),
    partId: z.string().nullable().optional(),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    unitPrice: z.number().optional(),
  })
  .strict();

/** RP10: freeform line on general-bucket POs only (RP8 rejects job-assigned). */
export const POST = async (
  request: Request,
  routeContext: RouteContext,
): Promise<Response> =>
  withApiHandler(async () => {
    const { id } = await routeContext.params;
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

    const parsed = AdHocSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid ad-hoc line payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const result = await addAdHocPurchaseOrderLine(
      getPool(),
      ctx.principal.id,
      id,
      parsed.data,
    );
    return jsonSuccess(result, ctx.manifest);
  });
