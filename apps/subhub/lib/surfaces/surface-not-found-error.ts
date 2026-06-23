import { isNotFoundError, NotFoundError } from "@latch/contracts";

/** Thrown when a surface lacks read access — maps to 404 in API and `notFound()` in RSC. */
export class SurfaceNotFoundError extends NotFoundError {
  constructor(message = "Surface not found") {
    super(message);
  }
}

export const isSurfaceNotFoundError = (error: unknown): error is SurfaceNotFoundError =>
  error instanceof SurfaceNotFoundError || isNotFoundError(error);
