import type { ReactNode } from "react";
import { type FieldAction, type FieldId, type Manifest } from "@latch/contracts";
export type FieldControlProps = {
    manifest: Manifest;
    field: FieldId;
    action?: FieldAction;
    children: ReactNode;
};
/** Field section gate — defaults to `read`; returns null when denied (server-safe). */
export declare const FieldControl: ({ manifest, field, action, children, }: FieldControlProps) => import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=field-control.d.ts.map