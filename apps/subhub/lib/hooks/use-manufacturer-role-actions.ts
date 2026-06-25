"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  postManufacturerAddRole,
  postManufacturerRemoveRole,
  SURFACE_API,
  type SurfaceDetailData,
  type SurfaceQueryResult,
} from "@/lib/surface-api";

import { surfaceDetailKey } from "./surface-query-keys";

export const useManufacturerRoleActions = (id: string) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: surfaceDetailKey("manufacturer_detail", id),
    });
    const listSurfaceId = SURFACE_API.manufacturer_detail?.listSurfaceId ?? "manufacturer_list";
    queryClient.invalidateQueries({
      queryKey: ["surface", listSurfaceId, "list"],
    });
  };

  const addRole = useMutation({
    mutationFn: async (role: string) => {
      const response = await postManufacturerAddRole(id, role);
      return {
        data: response.data,
        manifest: response.manifest,
      } satisfies SurfaceQueryResult<SurfaceDetailData>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(surfaceDetailKey("manufacturer_detail", id), result);
      invalidate();
    },
  });

  const removeRole = useMutation({
    mutationFn: async (role: string) => postManufacturerRemoveRole(id, role),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: surfaceDetailKey("manufacturer_detail", id),
      });
      invalidate();
    },
  });

  return { addRole, removeRole };
};
