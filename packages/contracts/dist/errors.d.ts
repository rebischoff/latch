/** Base for HTTP-mappable Latch errors. */
export declare abstract class LatchError extends Error {
    abstract readonly statusCode: number;
    abstract readonly code: string;
    constructor(message: string);
}
/** Client requested or attempted a forbidden action or Field (default 403). */
export declare class ForbiddenError extends LatchError {
    readonly statusCode = 403;
    readonly code = "FORBIDDEN";
    constructor(message?: string);
}
/** Resource or Field hidden when caller lacks access (optional 404 semantics). */
export declare class NotFoundError extends LatchError {
    readonly statusCode = 404;
    readonly code = "NOT_FOUND";
    constructor(message?: string);
}
/** Duck-typed check — safe when multiple `@latch/contracts` copies exist (e.g. Next RSC). */
export declare const isLatchError: (error: unknown, code?: LatchError["code"]) => error is LatchError;
export declare const isNotFoundError: (error: unknown) => error is NotFoundError;
/** Target already exists — e.g. restore when anchor row is live (default 409). */
export declare class ConflictError extends LatchError {
    readonly statusCode = 409;
    readonly code = "CONFLICT";
    constructor(message?: string);
}
export declare const isConflictError: (error: unknown) => error is ConflictError;
/** Body or params failed structural validation (strict write, Zod parse). */
export declare class ValidationError extends LatchError {
    readonly details?: unknown | undefined;
    readonly statusCode = 400;
    readonly code = "VALIDATION_ERROR";
    constructor(message?: string, details?: unknown | undefined);
}
//# sourceMappingURL=errors.d.ts.map