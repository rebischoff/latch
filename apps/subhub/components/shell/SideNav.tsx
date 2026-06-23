"use client";

import {
  ContactsOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  LinkOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { navSelectionKeyForPath } from "@/lib/nav-routes";
import type { NavIcon, NavItem } from "@/lib/nav";

const NAV_ICONS: Record<NavIcon, ReactNode> = {
  home: <HomeOutlined />,
  setting: <SettingOutlined />,
  user: <UserOutlined />,
  team: <TeamOutlined />,
  contacts: <ContactsOutlined />,
  customer: <UsergroupAddOutlined />,
  vendor: <ShopOutlined />,
  site: <EnvironmentOutlined />,
  relation: <LinkOutlined />,
  menu: null,
  login: null,
  logout: null,
};

type SideNavProps = {
  items: NavItem[];
};

const toMenuItems = (items: NavItem[]) =>
  items.map((item) => {
    if (item.type === "divider") {
      return { type: "divider" as const, key: item.key };
    }

    if (item.type === "group") {
      return {
        type: "group" as const,
        key: item.key,
        label: item.label,
        children: item.children.map((child) => ({
          key: child.key,
          icon: child.icon ? NAV_ICONS[child.icon] : undefined,
          label: <Link href={child.href}>{child.label}</Link>,
        })),
      };
    }

    return {
      key: item.key,
      icon: item.icon ? NAV_ICONS[item.icon] : undefined,
      label: <Link href={item.href}>{item.label}</Link>,
    };
  });

export const SideNav = ({ items }: SideNavProps) => {
  const pathname = usePathname();
  const selectedKey = navSelectionKeyForPath(pathname);

  return (
    <Menu
      mode="inline"
      theme="light"
      selectedKeys={selectedKey ? [selectedKey] : []}
      items={toMenuItems(items)}
    />
  );
};
