"use client";

import { App, ConfigProvider, Flex, Layout, Typography, theme } from "antd";
import { Suspense, type ReactNode } from "react";

import type { NavItem } from "@/lib/nav";

import {
  HeaderSurfaceToolbar,
  SurfaceActionsProvider,
} from "./SurfaceActionsProvider";
import { SideNav } from "./SideNav";
import { UserMenu } from "./UserMenu";

const { Header, Sider, Content } = Layout;

const SIDER_WIDTH = 240;

type AppShellInnerProps = {
  authenticated: boolean;
  navItems: NavItem[];
  children: ReactNode;
};

const AppShellInner = ({
  authenticated,
  navItems,
  children,
}: AppShellInnerProps) => {
  const { token } = theme.useToken();

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        width={SIDER_WIDTH}
        theme="light"
        style={{ height: "100vh", overflow: "auto" }}
      >
        <SideNav items={navItems} />
      </Sider>
      <Layout
        style={{
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: token.paddingLG,
            background: token.colorBgContainer,
            borderBottom: `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            SubHub
          </Typography.Title>
          <Flex align="center" gap={token.marginSM}>
            <HeaderSurfaceToolbar />
            <Suspense fallback={null}>
              <UserMenu authenticated={authenticated} />
            </Suspense>
          </Flex>
        </Header>
        <Content
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

type AppShellProps = {
  authenticated?: boolean;
  navItems: NavItem[];
  children: ReactNode;
};

export const AppShell = ({
  authenticated = false,
  navItems,
  children,
}: AppShellProps) => (
  <ConfigProvider>
    <App>
      <SurfaceActionsProvider>
        <AppShellInner authenticated={authenticated} navItems={navItems}>
          {children}
        </AppShellInner>
      </SurfaceActionsProvider>
    </App>
  </ConfigProvider>
);
