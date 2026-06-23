"use client";

import { Flex, Spin, theme } from "antd";
import { createPortal } from "react-dom";
import type { RefObject } from "react";

import { useScrollParentViewport } from "./useScrollParentViewport";

type SurfaceFormOverlayProps = {
  anchorRef: RefObject<HTMLElement | null>;
};

/** Blocks interaction over the visible form pane while a record load or save is in flight. */
export const SurfaceFormOverlay = ({ anchorRef }: SurfaceFormOverlayProps) => {
  const { token } = theme.useToken();
  const viewport = useScrollParentViewport(anchorRef);

  if (!viewport) {
    return null;
  }

  return createPortal(
    <Flex
      align="center"
      justify="center"
      style={{
        position: "fixed",
        top: viewport.top,
        left: viewport.left,
        width: viewport.width,
        height: viewport.height,
        zIndex: token.zIndexPopupBase,
        background: token.colorBgContainer,
        opacity: 0.72,
        pointerEvents: "auto",
      }}
      aria-busy
      aria-live="polite"
    >
      <Spin size="large" />
    </Flex>,
    document.body,
  );
};
