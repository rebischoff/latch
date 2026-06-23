"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

type ViewportRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const isScrollContainer = (element: HTMLElement): boolean => {
  const overflowY = window.getComputedStyle(element).overflowY;
  return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
};

const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  let current = element?.parentElement ?? null;

  while (current) {
    if (isScrollContainer(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
};

/** Visible rect of the nearest scrollable ancestor (or the viewport). */
export const useScrollParentViewport = (
  anchorRef: RefObject<HTMLElement | null>,
): ViewportRect | null => {
  const [rect, setRect] = useState<ViewportRect | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const scrollParent = findScrollParent(anchor) ?? document.documentElement;

    const update = () => {
      const bounds = scrollParent.getBoundingClientRect();
      setRect({
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
      });
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollParent);
    scrollParent.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      resizeObserver.disconnect();
      scrollParent.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [anchorRef]);

  return rect;
};
