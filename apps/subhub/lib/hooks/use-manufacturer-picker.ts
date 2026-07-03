"use client";

import { createSurfacePickerHook } from "@/lib/hooks/create-surface-picker-hook";
import { fetchSurfaceList } from "@/lib/surface-api";

import { manufacturerPickerKey } from "./surface-query-keys";

export const useManufacturerPicker = createSurfacePickerHook(
  manufacturerPickerKey,
  () => fetchSurfaceList("manufacturer_list"),
);
