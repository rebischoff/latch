import {
  jsonSuccess,
  parseOffsetLimitQuery,
  withApiHandler,
} from "@latch/app-kit";
import { ForbiddenError, surfaceAllows, ValidationError } from "@latch/contracts";
import { z } from "zod";

import { getPool, resolveContextFresh } from "@/lib/latch";
import { createGeneralBucketPurchaseOrder } from "@/lib/purchase-orders/repository";
import { loadSurfaceListQuery } from "../../../lib/surfaces/load-surface-list";

const CreateSchema = z
  .object({
    vendor_party_id: z.string().min(1),
    ship_to_note: z.string().optional(),
    delivery_method: z.string().nullable().optional(),
  })
  .strict();

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const url = new URL(request.url);
    const query = (parseOffsetLimitQuery(request) ?? {}) as Record<string, unknown>;
    const jobId = url.searchParams.get("job_id");
    const status = url.searchParams.get("status");
    const vendorPartyId = url.searchParams.get("vendor_party_id");
    if (jobId) {
      query.job_id = jobId;
    }
    if (status) {
      query.status = status;
    }
    if (vendorPartyId) {
      query.vendor_party_id = vendorPartyId;
    }
    const { data, manifest } = await loadSurfaceListQuery(
      "purchase_order_list",
      query,
    );
    return jsonSuccess(data, manifest);
  });

/** RP9: create a general-bucket (job-less) purchase order. */
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

    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid purchase order create payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const result = await createGeneralBucketPurchaseOrder(
      getPool(),
      ctx.principal.id,
      {
        vendorPartyId: parsed.data.vendor_party_id,
        shipToNote: parsed.data.ship_to_note,
        deliveryMethod: parsed.data.delivery_method,
      },
    );
    return jsonSuccess(result, ctx.manifest);
  });
