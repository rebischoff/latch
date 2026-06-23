"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchSitePartyPicker,
  type SitePartyPickerRole,
} from "@/lib/surface-api";

export const sitePartyPickerKey = (role: SitePartyPickerRole) =>
  ["site", "party-picker", role] as const;

export const useSitePartyPicker = (role: SitePartyPickerRole) =>
  useQuery({
    queryKey: sitePartyPickerKey(role),
    queryFn: () => fetchSitePartyPicker(role),
    staleTime: 30_000,
  });
