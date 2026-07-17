"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchRequisitionBomPool } from "@/lib/surface-api";

import { requisitionBomPoolKey } from "./surface-query-keys";

/** BOM "still needed" pool for a job — task 52 pin (List → New / job-scoped picker). */
export const useRequisitionBomPool = (jobId: string | undefined) =>
  useQuery({
    queryKey: requisitionBomPoolKey(jobId ?? ""),
    queryFn: () => fetchRequisitionBomPool(jobId!),
    enabled: Boolean(jobId),
    staleTime: 10_000,
  });
