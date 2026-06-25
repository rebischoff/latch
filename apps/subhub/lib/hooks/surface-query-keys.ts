import type { SurfaceId } from "@latch/contracts";

export const surfaceListKey = (surfaceId: SurfaceId, q?: string) =>
  ["surface", surfaceId, "list", q ?? ""] as const;

export const surfaceDetailKey = (surfaceId: SurfaceId, id: string) =>
  ["surface", surfaceId, "detail", id] as const;

export const estimateSitePickerKey = ["estimate", "site-picker"] as const;

export const jobSitePickerKey = ["job", "site-picker"] as const;

export const manufacturerPickerKey = ["manufacturer", "picker"] as const;

export const vendorPickerKey = ["vendor", "picker"] as const;
