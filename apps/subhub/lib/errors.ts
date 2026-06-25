import { LatchError } from "@latch/contracts";

/** Structured dependency row reported when DELETE is blocked. */
export type DeleteBlocker = {
  type: string;
  count: number;
  samples?: string[];
};

/** 409 when DELETE is blocked by dependent rows (cross-cutting delete-blocker contract). */
export class InUseError extends LatchError {
  readonly statusCode = 409;
  readonly code = "in_use";

  constructor(
    readonly entity: string,
    readonly blockers: ReadonlyArray<DeleteBlocker>,
    message?: string,
  ) {
    const total = blockers.reduce((sum, blocker) => sum + blocker.count, 0);
    super(
      message ??
        `Cannot delete ${entity}: referenced by ${total} dependent row${total === 1 ? "" : "s"}`,
    );
  }
}
