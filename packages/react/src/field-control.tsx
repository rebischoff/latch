import type { ReactNode } from "react";

import {
  fieldAllows,
  type FieldAction,
  type FieldId,
  type Manifest,
} from "@latch/contracts";

export type FieldControlProps = {
  manifest: Manifest;
  field: FieldId;
  action?: FieldAction;
  children: ReactNode;
};

/** Field section gate — defaults to `read`; returns null when denied (server-safe). */
export const FieldControl = ({
  manifest,
  field,
  action = "read",
  children,
}: FieldControlProps) => {
  if (!fieldAllows(manifest, field, action)) {
    return null;
  }
  return <>{children}</>;
};
