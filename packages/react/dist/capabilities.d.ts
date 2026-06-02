import { type ReactNode } from "react";
import { type FieldAction, type FieldId, type Manifest } from "@latch/contracts";
export type CapabilitiesProviderProps = {
    manifest: Manifest;
    children: ReactNode;
};
export declare const CapabilitiesProvider: ({ manifest, children, }: CapabilitiesProviderProps) => import("react/jsx-runtime").JSX.Element;
export type CanProps = {
    field: FieldId;
    action: FieldAction;
    children: ReactNode;
};
/** Renders children only when the manifest grants the Field action. */
export declare const Can: ({ field, action, children }: CanProps) => import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=capabilities.d.ts.map