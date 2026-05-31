import type { FieldAction, FieldId, FieldPolicyGrant, RowScope } from "@latch/contracts";
/** v1 merge options (global defaults; see global-options.md). */
export interface MergeOptions {
    denyWins: boolean;
}
declare const ALL_ACTIONS: FieldAction[];
/**
 * Merge field grants from multiple roles using `union_grants`.
 * Allows are unioned; explicit denies remove actions when `denyWins` is true.
 */
export declare const unionGrants: (grants: FieldPolicyGrant[], options: MergeOptions) => Record<FieldId, FieldAction[]>;
/**
 * Row scope for union_grants: `all` beats `own` (most permissive wins).
 */
export declare const mergeRowScope: (scopes: (RowScope | undefined)[]) => RowScope | undefined;
/** Union surface-level actions across roles (deduped, stable order). */
export declare const unionSurfaceActions: (actionLists: FieldAction[][]) => FieldAction[];
/** Known fields for a surface — ensures denied fields appear in the manifest. */
export declare const ensureFieldKeys: (fields: Record<FieldId, FieldAction[]>, knownFieldIds: FieldId[]) => Record<FieldId, FieldAction[]>;
export { ALL_ACTIONS };
//# sourceMappingURL=merge.d.ts.map