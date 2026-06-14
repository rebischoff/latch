"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SurfaceId } from "@latch/contracts";

import {
  deleteSurfaceDetail,
  patchSurfaceDetail,
  SURFACE_API,
  type SurfaceDetailData,
  type SurfaceQueryResult,
} from "@/lib/surface-api";

import { surfaceDetailKey, surfaceListKey } from "./surface-query-keys";

export const useSurfacePatch = (surfaceId: SurfaceId, id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const response = await patchSurfaceDetail(surfaceId, id, body);
      return {
        data: response.data,
        manifest: response.manifest,
      } satisfies SurfaceQueryResult<SurfaceDetailData>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(surfaceDetailKey(surfaceId, id), result);
      const listSurfaceId = SURFACE_API[surfaceId]?.listSurfaceId ?? surfaceId;
      queryClient.invalidateQueries({ queryKey: surfaceListKey(listSurfaceId) });
    },
  });
};

export const useSurfaceDelete = (surfaceId: SurfaceId, id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await deleteSurfaceDetail(surfaceId, id);
    },
    onSuccess: () => {
      const listSurfaceId = SURFACE_API[surfaceId]?.listSurfaceId ?? surfaceId;
      queryClient.invalidateQueries({ queryKey: surfaceListKey(listSurfaceId) });
      queryClient.removeQueries({ queryKey: surfaceDetailKey(surfaceId, id) });
    },
  });
};
