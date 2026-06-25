"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SurfaceId } from "@latch/contracts";

import {
  postSurfaceDetail,
  SURFACE_API,
  type SurfaceDetailData,
  type SurfaceQueryResult,
} from "@/lib/surface-api";

import { surfaceDetailKey } from "./surface-query-keys";

export const useSurfaceCreate = (surfaceId: SurfaceId, id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const response = await postSurfaceDetail(surfaceId, id, body);
      return {
        data: response.data,
        manifest: response.manifest,
      } satisfies SurfaceQueryResult<SurfaceDetailData>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(surfaceDetailKey(surfaceId, id), result);
      const listSurfaceId = SURFACE_API[surfaceId]?.listSurfaceId ?? surfaceId;
      queryClient.invalidateQueries({
        queryKey: ["surface", listSurfaceId, "list"],
      });
    },
  });
};
