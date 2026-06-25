"use client";

import { useQuery } from "@tanstack/react-query";
import type { SurfaceId } from "@latch/contracts";

import {
  fetchSurfaceList,
  type SurfaceListData,
  type SurfaceQueryResult,
} from "@/lib/surface-api";

import { surfaceListKey } from "./surface-query-keys";

type SurfaceListQuery = {
  q?: string;
};

export const useSurfaceList = (surfaceId: SurfaceId, query?: SurfaceListQuery) =>
  useQuery<SurfaceQueryResult<SurfaceListData>>({
    queryKey: surfaceListKey(surfaceId, query?.q),
    queryFn: async () => {
      const response = await fetchSurfaceList(surfaceId, query);
      return { data: response.data, manifest: response.manifest };
    },
    staleTime: 30_000,
  });
