"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCategoryRootPicker } from "@/lib/surface-api";

import { categoryRootPickerKey } from "./surface-query-keys";

export const useCategoryRootPicker = () =>
  useQuery({
    queryKey: categoryRootPickerKey,
    queryFn: () => fetchCategoryRootPicker(),
    staleTime: 30_000,
  });
