/** Base for HTTP-mappable Latch errors. */
export abstract class LatchError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Client requested or attempted a forbidden action or Field (default 403). */
export class ForbiddenError extends LatchError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";

  constructor(message = "Forbidden") {
    super(message);
  }
}

/** Resource or Field hidden when caller lacks access (optional 404 semantics). */
export class NotFoundError extends LatchError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";

  constructor(message = "Not found") {
    super(message);
  }
}

/** Duck-typed check — safe when multiple `@latch/contracts` copies exist (e.g. Next RSC). */
export const isLatchError = (
  error: unknown,
  code?: LatchError["code"],
): error is LatchError => {
  if (!(error instanceof Error)) {
    return false;
  }
  const candidate = error as Partial<LatchError>;
  if (
    typeof candidate.code !== "string" ||
    typeof candidate.statusCode !== "number"
  ) {
    return false;
  }
  return code === undefined || candidate.code === code;
};

export const isNotFoundError = (error: unknown): error is NotFoundError =>
  isLatchError(error, "NOT_FOUND");

/** Target already exists — e.g. restore when anchor row is live (default 409). */
export class ConflictError extends LatchError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";

  constructor(
    message = "Conflict",
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const isConflictError = (error: unknown): error is ConflictError =>
  isLatchError(error, "CONFLICT");

/** Body or params failed structural validation (strict write, Zod parse). */
export class ValidationError extends LatchError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(
    message = "Validation failed",
    readonly details?: unknown,
  ) {
    super(message);
  }
}
