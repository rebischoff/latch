"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchJobPartPicker } from "@/lib/surface-api";

export const useJobPartPicker = (
  itemId: string | null,
  jobConditionId: string | null,
  enabled: boolean,
  draft?: {
    include_discontinued?: boolean;
    specs?: Array<{
      spec_def_id: string;
      spec_option_id?: string | null;
      value_boolean?: boolean | null;
      value_number?: number | null;
      value_number_max?: number | null;
    }>;
  },
) => {
  const draftKey = JSON.stringify({
    i: draft?.include_discontinued ?? false,
    s: (draft?.specs ?? [])
      .map((spec) => ({
        d: spec.spec_def_id,
        o: spec.spec_option_id ?? null,
        b: spec.value_boolean ?? null,
        n: spec.value_number ?? null,
        m: spec.value_number_max ?? null,
      }))
      .sort((a, b) => a.d.localeCompare(b.d)),
  });

  return useQuery({
    queryKey: ["job-part-picker", itemId, jobConditionId, draftKey],
    enabled: enabled && Boolean(itemId && jobConditionId),
    queryFn: async () => {
      const result = await fetchJobPartPicker({
        itemId: itemId as string,
        jobConditionId: jobConditionId as string,
        conditionDraft: draft,
      });
      return result.data.parts;
    },
    staleTime: 30_000,
  });
};
