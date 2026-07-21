import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { ForbiddenError, surfaceAllows, ValidationError } from "@latch/contracts";
import { z } from "zod";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { batchCreatePurchaseOrders } from "@/lib/purchase-orders/repository";

const BatchCreateSchema = z
  .object({
    purchaseOrderId: z.string().optional(),
    selections: z
      .array(
        z
          .object({
            jobMaterialRequestId: z.string(),
            vendorPartyId: z.string(),
            quantity: z.number().positive().optional(),
            partId: z.string().nullable().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const POST = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContextFresh({
      surfaceId: "purchase_order_detail",
      entityId: "new",
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

    const parsed = BatchCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid batch-create payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const result = await batchCreatePurchaseOrders(
      getPool(),
      ctx.principal.id,
      parsed.data,
    );
    return jsonSuccess(result, ctx.manifest);
  });
