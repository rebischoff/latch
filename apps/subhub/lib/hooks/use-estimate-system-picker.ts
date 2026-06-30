"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchEstimateSystemPicker } from "@/lib/surface-api";

import { estimateSystemPickerKey } from "./surface-query-keys";

export const useEstimateSystemPicker = () =>
  useQuery({
    queryKey: estimateSystemPickerKey,
    queryFn: () => fetchEstimateSystemPicker(),
    staleTime: 30_000,
  });
