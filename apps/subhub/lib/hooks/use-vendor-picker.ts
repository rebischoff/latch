"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchSurfaceList } from "@/lib/surface-api";

import { vendorPickerKey } from "./surface-query-keys";

export const useVendorPicker = () =>
  useQuery({
    queryKey: vendorPickerKey,
    queryFn: () => fetchSurfaceList("vendor_list"),
    staleTime: 30_000,
  });
