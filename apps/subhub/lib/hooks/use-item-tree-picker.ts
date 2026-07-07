"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPartItemTreePicker } from "@/lib/surface-api";

import { partItemTreePickerKey } from "./surface-query-keys";

export const useItemTreePicker = (searchQuery?: string) =>
  useQuery({
    queryKey: partItemTreePickerKey(searchQuery),
    queryFn: async () => {
      const result = await fetchPartItemTreePicker(searchQuery);
      return result.data.tree;
    },
    staleTime: 30_000,
  });
