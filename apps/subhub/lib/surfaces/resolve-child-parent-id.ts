import type { MasterDetailSurfaceConfig } from "@/lib/hooks/use-master-detail-toolbar";

export type ResolveChildParentIdInput = {
  selectionId: string | null;
  entityId: string | null;
  config: MasterDetailSurfaceConfig;
};

/** Resolve parent id for New child — selection ref wins on tree surfaces; pathname entityId is fallback. */
export const resolveChildParentId = ({
  selectionId,
  entityId,
  config,
}: ResolveChildParentIdInput): string | null => {
  if (config.create?.variant === "item") {
    return selectionId ?? entityId;
  }

  return entityId;
};
