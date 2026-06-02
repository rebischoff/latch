import {
  isLatchError,
  ValidationError,
  type BulkOperationMode,
  type BulkUpdateResult,
  type Manifest,
} from "@latch/contracts";

/** Matches `bulkDefaultMode` in docs/foundations/global-options.md */
export const BULK_DEFAULT_MODE: BulkOperationMode = "partial";

export type JobApiSuccessBody<T> = {
  data: T;
  manifest: Manifest;
};

export type JobApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export const jsonSuccess = <T>(data: T, manifest: Manifest): Response =>
  Response.json({ data, manifest } satisfies JobApiSuccessBody<T>);

/** Map bulk DAL result to HTTP status per bulk-operations.md */
export const jsonBulkResult = (
  result: BulkUpdateResult,
  mode: BulkOperationMode,
): Response => {
  const conflict =
    mode === "all_or_nothing" &&
    (result.skipped.length > 0 || result.failed.length > 0);
  return Response.json(result, { status: conflict ? 409 : 200 });
};

export const mapLatchError = (error: unknown): Response => {
  if (isLatchError(error)) {
    const body: JobApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (error instanceof ValidationError && error.details !== undefined) {
      body.error.details = error.details;
    }

    return Response.json(body, { status: error.statusCode });
  }

  throw error;
};

export const withJobApiHandler = async (
  handler: () => Promise<Response>,
): Promise<Response> => {
  try {
    return await handler();
  } catch (error) {
    return mapLatchError(error);
  }
};
