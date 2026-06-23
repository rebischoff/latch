"use client";

import { useEffect, useState } from "react";

/** True only after `active` has been true continuously for `delayMs`. */
export const useDelayedOverlay = (
  active: boolean,
  delayMs = 500,
): boolean => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }

    const timer = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return show;
};
