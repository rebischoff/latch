"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { resolveActiveTab } from "@/lib/surface-navigation";

export type UseDetailTabInput = {
  availableKeys: readonly string[];
  defaultKey: string;
  /**
   * When false, still resolve `activeKey` but do not `replace` the URL.
   * Use while detail is loading so availability is not guessed from empty form defaults.
   */
  ready?: boolean;
};

export type UseDetailTabResult = {
  activeKey: string;
  setTab: (key: string) => void;
};

/**
 * URL-controlled detail tabs: `?tab=<key>`; omit `tab` on the surface default.
 * Unavailable / invalid `tab` values fall back and `replace` the URL when `ready`.
 */
export const useDetailTab = ({
  availableKeys,
  defaultKey,
  ready = true,
}: UseDetailTabInput): UseDetailTabResult => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const activeKey = resolveActiveTab(requested, availableKeys, defaultKey);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const urlTab = searchParams.get("tab");
    const shouldOmitTab = activeKey === defaultKey;

    if (shouldOmitTab) {
      if (urlTab === null) {
        return;
      }
    } else if (urlTab === activeKey) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (shouldOmitTab) {
      params.delete("tab");
    } else {
      params.set("tab", activeKey);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [activeKey, defaultKey, pathname, ready, router, searchParams]);

  const setTab = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === defaultKey) {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return { activeKey, setTab };
};
