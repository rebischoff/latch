"use client";

import {
  ExperimentOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Space, Tag, Tooltip, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ActAsPicker } from "@/app/components/act-as-picker";
import type { IamNavAccess } from "@/lib/iam-nav-access";
import type { ActAsUserOption } from "@/lib/iam-user/list-users";

const { Header, Content } = Layout;

type AppShellProps = {
  children: ReactNode;
  policyVersion: number;
  actAsUserId: string;
  actAsRoleCount: number;
  users: ActAsUserOption[];
  iamNavAccess: IamNavAccess;
};

const navKeyForPath = (pathname: string): string => {
  if (pathname.startsWith("/roles")) return "roles";
  if (pathname.startsWith("/dev")) return "dev";
  return "users";
};

export const AppShell = ({
  children,
  policyVersion,
  actAsUserId,
  actAsRoleCount,
  users,
  iamNavAccess,
}: AppShellProps) => {
  const pathname = usePathname();
  const selectedKey = navKeyForPath(pathname);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          paddingInline: 24,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
          Latch Policy Spike
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          style={{ flex: 1, minWidth: 0 }}
          items={[
            {
              key: "users",
              icon: <UserOutlined />,
              disabled: !iamNavAccess.users,
              label: iamNavAccess.users ? (
                <Link href="/users">Users</Link>
              ) : (
                <span title="Requires system_iam (Act as Bootstrap admin)">
                  Users
                </span>
              ),
            },
            {
              key: "roles",
              icon: <TeamOutlined />,
              disabled: !iamNavAccess.roles,
              label: iamNavAccess.roles ? (
                <Link href="/roles">Roles</Link>
              ) : (
                <span title="Requires system_iam (Act as Bootstrap admin)">
                  Roles
                </span>
              ),
            },
            {
              key: "dev",
              icon: <ExperimentOutlined />,
              label: <Link href="/dev/policy-api">Dev</Link>,
            },
          ]}
        />
        <Space size="middle">
          <ActAsPicker
            users={users}
            currentUserId={actAsUserId}
            roleCount={actAsRoleCount}
          />
          <Tooltip title="Global permission generation — bumps on grant, binding, role delete, and assignment changes.">
            <Tag color="blue">Policy v{policyVersion}</Tag>
          </Tooltip>
        </Space>
      </Header>
      <Content
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        {children}
      </Content>
    </Layout>
  );
};
