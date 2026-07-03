"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchEstimateSiteTree } from "@/lib/surface-api";

import { estimateSiteTreeKey } from "./surface-query-keys";

export const useEstimateSiteTree = (siteId: string | undefined) =>
  useQuery({
    queryKey: estimateSiteTreeKey(siteId ?? ""),
    queryFn: () => fetchEstimateSiteTree(siteId as string),
    enabled: Boolean(siteId),
    staleTime: 30_000,
  });
