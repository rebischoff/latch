import { type FieldId, type PermissionContext } from "@latch/contracts";
export type SplitVerificationPatchResult = {
    directPatch: Record<string, unknown>;
    pendingPatch: Record<string, unknown>;
    pendingFieldIds: FieldId[];
};
/**
 * Hybrid verification routing: Fields in `verificationFieldIds` with `write` stay
 * on the direct path; `submit` ∧ ¬`write` → pending bundle; otherwise forbidden.
 */
export declare const splitVerificationPatch: (ctx: PermissionContext, patch: Record<string, unknown>, verificationFieldIds: readonly FieldId[] | undefined) => SplitVerificationPatchResult;
/**
 * T10 — verification Fields must not hit live rows unless manifest grants `write`
 * or the caller is the `acceptPending` applier path.
 */
export declare const assertVerificationDirectWrite: (ctx: PermissionContext, directPatch: Record<string, unknown>, verificationFieldIds: readonly FieldId[] | undefined, options?: {
    applier?: boolean;
}) => void;
//# sourceMappingURL=pending-routing.d.ts.map