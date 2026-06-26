"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SurfaceId } from "@latch/contracts";

import {
  postSurfaceListCreate,
  type SurfaceDetailData,
  type SurfaceQueryResult,
} from "@/lib/surface-api";

import { surfaceDetailKey, surfaceListKey } from "./surface-query-keys";

/** POST create on a list route (DB-assigned id); optional detail surface for cache seeding. */
export const useSurfaceListCreate = (
  listSurfaceId: SurfaceId,
  detailSurfaceId?: SurfaceId,
) => {
  const queryClient = useQueryClient();
  const detailSurface = detailSurfaceId ?? listSurfaceId;

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const response = await postSurfaceListCreate(listSurfaceId, body);
      return {
        data: response.data,
        manifest: response.manifest,
      } satisfies SurfaceQueryResult<SurfaceDetailData>;
    },
    onSuccess: (result) => {
      const id = result.data.id;
      if (id) {
        queryClient.setQueryData(surfaceDetailKey(detailSurface, String(id)), result);
      }
      queryClient.invalidateQueries({
        queryKey: surfaceListKey(listSurfaceId),
      });
    },
  });
};
