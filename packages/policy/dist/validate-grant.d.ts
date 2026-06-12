import type { FieldAction, FieldId } from "@latch/contracts";
import type { PolicyRegistry, SurfacePolicyDefinition } from "./registry.js";
/** One grant tuple validated at role-editor write time (P6). */
export type GrantTuple = {
    surfaceId: string;
    fieldId: FieldId | null;
    action: FieldAction;
};
/**
 * Reject grants outside the codegen vocabulary catalog (decision 4 / invariant 3).
 * Unknown surface/field/action → ValidationError (4xx), not strip.
 */
export declare const validateGrantAgainstCatalog: (grant: Pick<GrantTuple, "fieldId" | "action">, surfaceDef: SurfacePolicyDefinition) => void;
/** Resolve `surfaceId` in the registry; reject IAM-surface grants for app-role configuration. */
export declare const resolveGrantSurfaceDef: (surfaceId: string, registry: PolicyRegistry, opts?: {
    allowIamSurfaces?: boolean;
}) => SurfacePolicyDefinition;
/** Validate a full grant tuple (surface + field/action) against the registry catalog. */
export declare const validateGrantTuple: (grant: GrantTuple, registry: PolicyRegistry, opts?: {
    allowIamSurfaces?: boolean;
}) => void;
//# sourceMappingURL=validate-grant.d.ts.map