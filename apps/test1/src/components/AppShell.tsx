"use client";

import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Layout, Menu, type MenuProps, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { signOutAction } from "@/app/actions/auth";
import type { NavItem } from "@/lib/nav";

const { Header, Sider, Content } = Layout;

type AppShellProps = {
  userLabel: string;
  navItems: NavItem[];
  children: React.ReactNode;
};

export const AppShell = ({ userLabel, navItems, children }: AppShellProps) => {
  const pathname = usePathname();
  const [loggingOut, startLogout] = useTransition();

  const menuItems: MenuProps["items"] = navItems.map((item) => ({
    key: item.key,
    label: <Link href={item.href}>{item.label}</Link>,
  }));

  const onLogout = () => {
    startLogout(() => {
      void signOutAction();
    });
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: 16,
          height: 48,
          lineHeight: "48px",
        }}
      >
        <Typography.Text strong style={{ color: "#fff" }}>
          test1 (Latch learn)
        </Typography.Text>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Typography.Text style={{ color: "rgba(255,255,255,0.85)" }}>
            <UserOutlined style={{ marginRight: 6 }} />
            {userLabel}
          </Typography.Text>
          <Button
            type="default"
            size="small"
            icon={<LogoutOutlined />}
            loading={loggingOut}
            onClick={onLogout}
          >
            Log out
          </Button>
        </div>
      </Header>
      <Layout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{ height: "100%", borderInlineEnd: 0 }}
          />
        </Sider>
        <Content style={{ padding: 16, background: "#f5f5f5" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
