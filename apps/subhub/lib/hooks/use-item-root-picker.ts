"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchItemRootPicker } from "@/lib/surface-api";

import { itemRootPickerKey } from "./surface-query-keys";

export const useItemRootPicker = () =>
  useQuery({
    queryKey: itemRootPickerKey,
    queryFn: () => fetchItemRootPicker(),
    staleTime: 30_000,
  });
