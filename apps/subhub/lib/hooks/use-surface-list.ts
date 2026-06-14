"use client";

import { useQuery } from "@tanstack/react-query";
import type { SurfaceId } from "@latch/contracts";

import {
  fetchSurfaceList,
  type SurfaceListData,
  type SurfaceQueryResult,
} from "@/lib/surface-api";

import { surfaceListKey } from "./surface-query-keys";

export const useSurfaceList = (surfaceId: SurfaceId) =>
  useQuery<SurfaceQueryResult<SurfaceListData>>({
    queryKey: surfaceListKey(surfaceId),
    queryFn: async () => {
      const response = await fetchSurfaceList(surfaceId);
      return { data: response.data, manifest: response.manifest };
    },
    staleTime: 30_000,
  });
