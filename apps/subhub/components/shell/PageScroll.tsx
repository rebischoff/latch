"use client";

import { theme } from "antd";
import type { ReactNode } from "react";

type PageScrollProps = {
  children: ReactNode;
};

/** Scrollable main area for routes that do not use `MasterDetailShell`. */
export const PageScroll = ({ children }: PageScrollProps) => {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        padding: token.paddingLG,
      }}
    >
      {children}
    </div>
  );
};
