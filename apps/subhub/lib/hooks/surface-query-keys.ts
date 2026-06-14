import type { SurfaceId } from "@latch/contracts";

export const surfaceListKey = (surfaceId: SurfaceId) =>
  ["surface", surfaceId, "list"] as const;

export const surfaceDetailKey = (surfaceId: SurfaceId, id: string) =>
  ["surface", surfaceId, "detail", id] as const;
