"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchEstimateItemPicker,
  fetchEstimatePartPicker,
  type ItemTreePickerNode,
} from "@/lib/surface-api";

export type ItemTreeNode = ItemTreePickerNode;

export const useEstimateItemPicker = (rootCategoryId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ["estimate-item-picker", rootCategoryId],
    enabled: enabled && Boolean(rootCategoryId),
    queryFn: async () => {
      const result = await fetchEstimateItemPicker(rootCategoryId as string);
      return result.data.tree;
    },
    staleTime: 30_000,
  });

export const useEstimatePartPicker = (
  itemId: string | null,
  estimateScopeId: string | null,
  siteZoneId: string | null,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ["estimate-part-picker", itemId, estimateScopeId, siteZoneId],
    enabled: enabled && Boolean(itemId && estimateScopeId),
    queryFn: async () => {
      const result = await fetchEstimatePartPicker({
        itemId: itemId as string,
        estimateScopeId: estimateScopeId as string,
        siteZoneId,
      });
      return result.data.parts;
    },
    staleTime: 30_000,
  });
