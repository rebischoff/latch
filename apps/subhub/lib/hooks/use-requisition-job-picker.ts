"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchRequisitionJobPicker } from "@/lib/surface-api";

import { requisitionJobPickerKey } from "./surface-query-keys";

export const useRequisitionJobPicker = () =>
  useQuery({
    queryKey: requisitionJobPickerKey,
    queryFn: () => fetchRequisitionJobPicker(),
    staleTime: 30_000,
  });
