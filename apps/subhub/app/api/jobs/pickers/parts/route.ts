import { jsonSuccess, withApiHandler } from "@latch/app-kit";
import { fieldAllows, ForbiddenError, ValidationError } from "@latch/contracts";
import { z } from "zod";

import {
  mergeBucketSpecs,
  type BucketSpecValue,
} from "@/lib/estimates/repository/estimate-bucket-specs";
import { resolveFilteredParts } from "@/lib/estimates/repository/estimate-part-resolver";
import { getPool, resolveContext } from "@/lib/latch";
import { assertSurfaceRead } from "@/lib/surfaces/assert-surface-read";

const JobPartPickerDraftSpecSchema = z
  .object({
    spec_def_id: z.string(),
    spec_option_id: z.string().nullable().optional(),
    value_boolean: z.boolean().nullable().optional(),
    value_number: z.number().nullable().optional(),
    value_number_max: z.number().nullable().optional(),
  })
  .strict();

const JobPartPickerRequestSchema = z
  .object({
    item_id: z.string().min(1),
    job_condition_id: z.string().min(1),
    condition_draft: z
      .object({
        specs: z.array(JobPartPickerDraftSpecSchema).optional(),
        include_discontinued: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/**
 * Parts list for Job Scope Part Select (task 47 JLI-5).
 * Uses form-merged condition draft when provided (same matcher as estimate).
 */
export const POST = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "job_detail" });
    assertSurfaceRead(ctx);

    if (!fieldAllows(ctx.manifest, "line_items", "read")) {
      throw new ForbiddenError();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Invalid JSON body", { code: "invalid_json" });
    }

    const parsed = JobPartPickerRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid parts picker payload", {
        code: "invalid_body",
        issues: parsed.error.issues,
      });
    }

    const draftSpecs: BucketSpecValue[] = (parsed.data.condition_draft?.specs ?? []).map(
      (spec) => ({
        spec_def_id: spec.spec_def_id,
        spec_option_id: spec.spec_option_id ?? null,
        value_boolean: spec.value_boolean ?? null,
        value_number: spec.value_number ?? null,
        value_number_max: spec.value_number_max ?? null,
      }),
    );

    const bucket = mergeBucketSpecs(draftSpecs, []);
    const includeDiscontinued =
      parsed.data.condition_draft?.include_discontinued ?? false;

    const parts = await resolveFilteredParts(
      getPool(),
      parsed.data.item_id,
      bucket,
      includeDiscontinued,
    );

    return jsonSuccess({ parts }, ctx.manifest);
  });
