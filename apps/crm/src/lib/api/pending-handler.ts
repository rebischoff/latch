import {
  isLatchError,
  ValidationError,
  type Manifest,
} from "@latch/contracts";

export type PendingApiSuccessBody<T> = {
  data: T;
  manifest: Manifest;
};

export type PendingApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export const jsonSuccess = <T>(data: T, manifest: Manifest): Response =>
  Response.json({ data, manifest } satisfies PendingApiSuccessBody<T>);

export const mapLatchError = (error: unknown): Response => {
  if (isLatchError(error)) {
    const body: PendingApiErrorBody = {
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

export const withPendingApiHandler = async (
  handler: () => Promise<Response>,
): Promise<Response> => {
  try {
    return await handler();
  } catch (error) {
    return mapLatchError(error);
  }
};
