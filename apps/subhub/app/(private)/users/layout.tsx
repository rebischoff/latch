import { HydrationBoundary } from "@tanstack/react-query";

import { UserListPane } from "@/components/iam/UserListPane";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type UsersLayoutProps = {
  children: React.ReactNode;
};

const UsersLayout = async ({ children }: UsersLayoutProps) => {
  await requireAuth(routes.users.list);
  const dehydratedState = await prefetchSurfaceList("user_list");

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<UserListPane />}>{children}</MasterDetailShell>
    </HydrationBoundary>
  );
};

export default UsersLayout;
