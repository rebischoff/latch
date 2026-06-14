"use client";

import { Layout, theme } from "antd";
import type { ReactNode } from "react";

const { Sider, Content } = Layout;

const LIST_SIDER_WIDTH = 320;

type MasterDetailShellProps = {
  list: ReactNode;
  children: ReactNode;
};

export const MasterDetailShell = ({ list, children }: MasterDetailShellProps) => {
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: 480, background: "transparent" }}>
      <Sider
        width={LIST_SIDER_WIDTH}
        theme="light"
        style={{
          borderRight: `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
          background: "transparent",
        }}
      >
        {list}
      </Sider>
      <Content style={{ padding: token.paddingLG, minHeight: 480 }}>
        {children}
      </Content>
    </Layout>
  );
};
