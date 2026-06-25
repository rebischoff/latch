"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchSurfaceList } from "@/lib/surface-api";

import { manufacturerPickerKey } from "./surface-query-keys";

export const useManufacturerPicker = () =>
  useQuery({
    queryKey: manufacturerPickerKey,
    queryFn: () => fetchSurfaceList("manufacturer_list"),
    staleTime: 30_000,
  });
