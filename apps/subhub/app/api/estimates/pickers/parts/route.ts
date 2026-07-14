import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError, ValidationError } from "@latch/contracts";

import { getPool, resolveContext } from "@/lib/latch";
import { loadMergedBucketForLine } from "@/lib/estimates/repository/estimate-bucket-specs";
import { resolveFilteredParts } from "@/lib/estimates/repository/estimate-part-resolver";
import {
  EstimatePartPickerRequestSchema,
  loadConditionIncludeDiscontinued,
  loadFilteredPartsForEstimateLine,
  loadFilteredPartsWithDraft,
} from "@/lib/estimates/repository/estimate-part-picker";
import { assertSurfaceRead } from "@/lib/surfaces/assert-surface-read";

const assertPartsRead = async () => {
  const ctx = await resolveContext({ surfaceId: "estimate_detail" });
  assertSurfaceRead(ctx);

  if (!fieldAllows(ctx.manifest, "line_items", "read")) {
    throw new ForbiddenError();
  }

  return ctx;
};

/** Saved-only parts list (no unsaved condition draft). Prefer POST when C is dirty. */
export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await assertPartsRead();

    const params = new URL(request.url).searchParams;
    const itemId = params.get("item_id")?.trim();
    if (!itemId) {
      throw new ValidationError("item_id is required", {
        field: "item_id",
        code: "required",
      });
    }

    const pool = getPool();
    const estimateId = params.get("estimate_id")?.trim();
    const lineId = params.get("line_id")?.trim();
    const estimateConditionId = params.get("estimate_condition_id")?.trim();

    let parts;

    if (estimateId && lineId) {
      parts = await loadFilteredPartsForEstimateLine(pool, estimateId, lineId, itemId);
    } else if (estimateConditionId) {
      const bucket = await loadMergedBucketForLine(
        pool,
        estimateConditionId,
        lineId ?? null,
      );
      const includeDiscontinued = await loadConditionIncludeDiscontinued(
        pool,
        estimateConditionId,
      );
      parts = await resolveFilteredParts(
        pool,
        itemId,
        bucket,
        includeDiscontinued,
      );
    } else {
      throw new ValidationError(
        "estimate_id+line_id or estimate_condition_id is required",
        {
          field: "estimate_condition_id",
          code: "required",
        },
      );
    }

    return jsonSuccess({ parts }, ctx.manifest);
  });

/** Parts list using the same draft-bucket merge as line-preview. */
export const POST = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await assertPartsRead();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body", { code: "invalid_json" });
    }

    const parsed = EstimatePartPickerRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid parts picker payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const pool = getPool();
    const parts = await loadFilteredPartsWithDraft(pool, parsed.data);
    return jsonSuccess({ parts }, ctx.manifest);
  });
