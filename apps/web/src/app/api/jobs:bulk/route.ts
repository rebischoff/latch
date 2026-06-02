import type { BulkOperationMode } from "@latch/contracts";
import { ValidationError } from "@latch/contracts";

import {
  BULK_DEFAULT_MODE,
  jsonBulkResult,
  withJobApiHandler,
} from "@/lib/api/job-handler";
import { getJobsDal, resolveContext } from "@/lib/latch";

type BulkBody = {
  ids?: unknown;
  patch?: unknown;
  mode?: unknown;
};

const parseBulkMode = (raw: unknown): BulkOperationMode => {
  if (raw === undefined || raw === null) {
    return BULK_DEFAULT_MODE;
  }
  if (raw === "partial" || raw === "all_or_nothing") {
    return raw;
  }
  throw new ValidationError("Invalid bulk mode", {
    mode: ["Must be partial or all_or_nothing"],
  });
};

const parseBulkIds = (raw: unknown): string[] => {
  if (!Array.isArray(raw) || raw.some((id) => typeof id !== "string")) {
    throw new ValidationError("Invalid bulk ids", {
      ids: ["Must be an array of strings"],
    });
  }
  return raw;
};

const parseBulkBody = async (request: Request): Promise<BulkBody> => {
  try {
    return (await request.json()) as BulkBody;
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
};

export const PATCH = async (request: Request): Promise<Response> =>
  withJobApiHandler(async () => {
    const body = await parseBulkBody(request);
    const ids = parseBulkIds(body.ids);
    const mode = parseBulkMode(body.mode);

    if (body.patch === undefined || typeof body.patch !== "object") {
      throw new ValidationError("Invalid bulk patch", {
        patch: ["Required object"],
      });
    }

    const ctx = resolveContext({ surfaceId: "job_list" });
    const result = await getJobsDal().bulkUpdate(ctx, ids, body.patch, { mode });
    return jsonBulkResult(result, mode);
  });

export const DELETE = async (request: Request): Promise<Response> =>
  withJobApiHandler(async () => {
    const body = await parseBulkBody(request);
    const ids = parseBulkIds(body.ids);
    const mode = parseBulkMode(body.mode);

    const ctx = resolveContext({ surfaceId: "job_list" });
    const result = await getJobsDal().bulkDelete(ctx, ids, { mode });
    return jsonBulkResult(result, mode);
  });
