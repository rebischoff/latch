import type { SurfaceId } from "@latch/contracts";

export const surfaceListKey = (surfaceId: SurfaceId, q?: string) =>
  ["surface", surfaceId, "list", q ?? ""] as const;

export const surfaceDetailKey = (surfaceId: SurfaceId, id: string) =>
  ["surface", surfaceId, "detail", id] as const;

export const estimateSitePickerKey = ["estimate", "site-picker"] as const;

export const estimateSiteTreeKey = (siteId: string) =>
  ["estimate", "site-tree", siteId] as const;

export const estimateSiteZonesPickerKey = (siteId: string) =>
  ["estimate", "site-zones-picker", siteId] as const;

export const itemRootPickerKey = ["catalog", "category-root-picker"] as const;

export const partItemTreePickerKey = (searchQuery?: string) =>
  ["part", "item-tree-picker", searchQuery ?? ""] as const;

export const partSpecDefsPickerKey = (itemIds: string[]) =>
  ["part", "spec-defs-picker", ...itemIds] as const;

export const jobSitePickerKey = ["job", "site-picker"] as const;

export const requisitionJobPickerKey = ["requisition", "job-picker"] as const;

export const requisitionBomPoolKey = (jobId: string) =>
  ["requisition", "bom-pool", jobId] as const;

export const manufacturerPickerKey = ["manufacturer", "picker"] as const;

export const vendorPickerKey = ["vendor", "picker"] as const;
