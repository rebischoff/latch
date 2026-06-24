"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchEstimateSitePicker } from "@/lib/surface-api";

import { estimateSitePickerKey } from "./surface-query-keys";

export const useEstimateSitePicker = () =>
  useQuery({
    queryKey: estimateSitePickerKey,
    queryFn: () => fetchEstimateSitePicker(),
    staleTime: 30_000,
  });
