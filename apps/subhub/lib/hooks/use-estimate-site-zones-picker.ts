"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchEstimateSiteZonesPicker } from "@/lib/surface-api";

import { estimateSiteZonesPickerKey } from "./surface-query-keys";

export const useEstimateSiteZonesPicker = (siteId: string | undefined) =>
  useQuery({
    queryKey: estimateSiteZonesPickerKey(siteId ?? ""),
    queryFn: () => fetchEstimateSiteZonesPicker(siteId as string),
    enabled: Boolean(siteId),
    staleTime: 30_000,
  });
