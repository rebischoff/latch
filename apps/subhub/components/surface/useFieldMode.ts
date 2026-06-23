"use client";

import { fieldAllows, type FieldId } from "@latch/contracts";
import { useManifest } from "@latch/react";

export type FieldMode = "hidden" | "read" | "write";

export const useFieldMode = (field: FieldId): FieldMode => {
  const manifest = useManifest();

  if (!fieldAllows(manifest, field, "read")) {
    return "hidden";
  }

  if (fieldAllows(manifest, field, "write")) {
    return "write";
  }

  return "read";
};
