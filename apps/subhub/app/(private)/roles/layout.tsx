import { HydrationBoundary } from "@tanstack/react-query";

import { RoleListPane } from "@/components/iam/RoleListPane";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type RolesLayoutProps = {
  children: React.ReactNode;
};

const RolesLayout = async ({ children }: RolesLayoutProps) => {
  await requireAuth(routes.roles.list);
  const dehydratedState = await prefetchSurfaceList("role_list");

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<RoleListPane />}>{children}</MasterDetailShell>
    </HydrationBoundary>
  );
};

export default RolesLayout;
