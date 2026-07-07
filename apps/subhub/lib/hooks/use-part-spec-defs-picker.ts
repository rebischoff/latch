"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPartSpecDefsPicker } from "@/lib/surface-api";

import { partSpecDefsPickerKey } from "./surface-query-keys";

export const usePartSpecDefsPicker = (itemIds: string[], enabled: boolean) =>
  useQuery({
    queryKey: partSpecDefsPickerKey(itemIds),
    enabled: enabled && itemIds.length > 0,
    queryFn: async () => {
      const result = await fetchPartSpecDefsPicker(itemIds);
      return result.data.defs;
    },
    staleTime: 30_000,
  });
