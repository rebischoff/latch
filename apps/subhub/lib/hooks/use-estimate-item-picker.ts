"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchEstimateItemPicker,
  fetchEstimatePartPicker,
  type ItemTreePickerNode,
} from "@/lib/surface-api";

export type ItemTreeNode = ItemTreePickerNode;

export const useEstimateItemPicker = (rootItemId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ["estimate-item-picker", rootItemId],
    enabled: enabled && Boolean(rootItemId),
    queryFn: async () => {
      const result = await fetchEstimateItemPicker(rootItemId as string);
      return result.data.tree;
    },
    staleTime: 30_000,
  });

export const useEstimatePartPicker = (
  itemId: string | null,
  estimateConditionId: string | null,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ["estimate-part-picker", itemId, estimateConditionId],
    enabled: enabled && Boolean(itemId && estimateConditionId),
    queryFn: async () => {
      const result = await fetchEstimatePartPicker({
        itemId: itemId as string,
        estimateConditionId: estimateConditionId as string,
      });
      return result.data.parts;
    },
    staleTime: 30_000,
  });
