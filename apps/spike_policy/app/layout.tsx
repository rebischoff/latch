import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/app/components/app-shell";
import { getActAsPrincipalId } from "@/lib/act-as";
import { getPool } from "@/lib/db";
import { resolveIamNavAccess } from "@/lib/iam-nav-access";
import { getPolicyVersion } from "@/lib/iam/policy-version-read";
import { listUsersForActAs } from "@/lib/iam-user/list-users";
import { loadPrincipalFromDb } from "@/lib/request-policy";

import "./globals.css";

export const metadata: Metadata = {
  title: "Latch Policy Spike",
  description: "Policy console harness for @latch/policy",
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProps) => {
  const pool = getPool();
  const [policyVersion, actAsUserId, users] = await Promise.all([
    getPolicyVersion(pool),
    getActAsPrincipalId(),
    listUsersForActAs(pool),
  ]);
  const principal = await loadPrincipalFromDb(pool, actAsUserId);
  const iamNavAccess = await resolveIamNavAccess(pool, principal);

  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <AppShell
            policyVersion={policyVersion}
            actAsUserId={actAsUserId}
            actAsRoleCount={principal.bindings.length}
            users={users}
            iamNavAccess={iamNavAccess}
          >
            {children}
          </AppShell>
        </AntdRegistry>
      </body>
    </html>
  );
};

export default RootLayout;
