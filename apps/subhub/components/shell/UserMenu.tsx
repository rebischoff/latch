"use client";

import {
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Space, theme } from "antd";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import { loginHref } from "@/lib/auth-utils";
import { HEADER_MENU } from "@/lib/nav";

type UserMenuProps = {
  authenticated: boolean;
};

const HEADER_ICONS = {
  login: <LoginOutlined />,
  logout: <LogoutOutlined />,
  setting: <SettingOutlined />,
} as const;

export const UserMenu = ({ authenticated }: UserMenuProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = theme.useToken();
  const { data: session } = authClient.useSession();

  const currentPath =
    searchParams.toString().length > 0
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

  const handleLogout = useCallback(async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const menuEntries = useMemo(
    () =>
      HEADER_MENU.filter(
        (entry) => entry.kind === "public" || (entry.kind === "session" && authenticated),
      ),
    [authenticated],
  );

  const menuItems = useMemo(
    () =>
      menuEntries.map((entry) => {
        if (entry.action === "logout") {
          return {
            key: entry.key,
            icon: HEADER_ICONS.logout,
            label: entry.label,
            onClick: () => {
              void handleLogout();
            },
          };
        }

        const href =
          entry.key === "login" ? loginHref(currentPath) : (entry.href ?? "/");

        return {
          key: entry.key,
          icon: HEADER_ICONS[entry.icon as keyof typeof HEADER_ICONS],
          label: <Link href={href}>{entry.label}</Link>,
        };
      }),
    [currentPath, handleLogout, menuEntries],
  );

  if (!authenticated) {
    return (
      <Dropdown menu={{ items: menuItems }}>
        <Button
          type="text"
          aria-label="Menu"
          icon={<MenuOutlined style={{ fontSize: token.fontSizeLG }} />}
        />
      </Dropdown>
    );
  }

  const label = session?.user?.email ?? session?.user?.name ?? "Account";

  return (
    <Dropdown menu={{ items: menuItems }}>
      <Space
        aria-label="User menu"
        style={{ cursor: "pointer" }}
        role="button"
        tabIndex={0}
      >
        <Avatar size="small" icon={<UserOutlined />} />
        <span>{label}</span>
      </Space>
    </Dropdown>
  );
};
