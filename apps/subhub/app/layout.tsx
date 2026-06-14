import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { RootShell } from "@/components/shell/RootShell";
import { isAuthenticated } from "@/lib/auth-session";
import { getNavItems } from "@/lib/nav-server";

import "./globals.css";

export const metadata: Metadata = {
  title: "SubHub",
  description: "Latch business app (SubHub)",
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProps) => {
  const authenticated = await isAuthenticated();
  const navItems = await getNavItems(authenticated);

  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <RootShell authenticated={authenticated} navItems={navItems}>
            {children}
          </RootShell>
        </AntdRegistry>
      </body>
    </html>
  );
};

export default RootLayout;
