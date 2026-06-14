"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { SurfaceId } from "@latch/contracts";

import {
  fetchSurfaceDetail,
  type SurfaceDetailData,
  type SurfaceQueryResult,
} from "@/lib/surface-api";

import { surfaceDetailKey } from "./surface-query-keys";

export const useSurfaceDetail = (surfaceId: SurfaceId, id: string | undefined) =>
  useQuery<SurfaceQueryResult<SurfaceDetailData>>({
    queryKey: surfaceDetailKey(surfaceId, id ?? ""),
    queryFn: async () => {
      const response = await fetchSurfaceDetail(surfaceId, id!);
      return { data: response.data, manifest: response.manifest };
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
