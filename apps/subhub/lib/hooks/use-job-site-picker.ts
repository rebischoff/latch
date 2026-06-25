"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchJobSitePicker } from "@/lib/surface-api";

import { jobSitePickerKey } from "./surface-query-keys";

export const useJobSitePicker = () =>
  useQuery({
    queryKey: jobSitePickerKey,
    queryFn: () => fetchJobSitePicker(),
    staleTime: 30_000,
  });
