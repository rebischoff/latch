"use client";

import { Layout, theme } from "antd";
import type { ReactNode } from "react";

const { Sider, Content } = Layout;

const LIST_SIDER_WIDTH = 256;

type MasterDetailShellProps = {
  list: ReactNode;
  children: ReactNode;
};

export const MasterDetailShell = ({ list, children }: MasterDetailShellProps) => {
  const { token } = theme.useToken();

  return (
    <Layout
      style={{
        flex: 1,
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <Sider
        width={LIST_SIDER_WIDTH}
        theme="light"
        style={{
          borderRight: `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
          background: "transparent",
          height: "100%",
          overflow: "auto",
        }}
      >
        {list}
      </Sider>
      <Content
        style={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "auto",
          padding: token.paddingLG,
        }}
      >
        {children}
      </Content>
    </Layout>
  );
};
