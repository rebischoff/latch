"use client";

import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import type { NavItem } from "@/lib/nav";

import { AppShell } from "./AppShell";

type RootShellProps = {
  authenticated?: boolean;
  navItems: NavItem[];
  children: ReactNode;
};

export const RootShell = ({
  authenticated = false,
  navItems,
  children,
}: RootShellProps) => (
  <Providers>
    <AppShell authenticated={authenticated} navItems={navItems}>
      {children}
    </AppShell>
  </Providers>
);
