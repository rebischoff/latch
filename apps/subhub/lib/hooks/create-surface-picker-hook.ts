"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export const createSurfacePickerHook =
  <TData>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<TData>,
    staleTime = 30_000,
  ): (() => UseQueryResult<TData>) =>
  () =>
    useQuery({
      queryKey,
      queryFn,
      staleTime,
    });
