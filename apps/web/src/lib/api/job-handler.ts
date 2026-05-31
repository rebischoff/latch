import {
  LatchError,
  ValidationError,
  type Manifest,
} from "@latch/contracts";

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

export const mapLatchError = (error: unknown): Response => {
  if (error instanceof LatchError) {
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
