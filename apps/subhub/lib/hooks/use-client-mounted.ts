"use client";

import { useEffect, useState } from "react";

/** True after the first client paint — use to skip SSR-incompatible libraries (e.g. @dnd-kit). */
export const useClientMounted = (): boolean => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};
