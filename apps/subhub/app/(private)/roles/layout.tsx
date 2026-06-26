import { HydrationBoundary } from "@tanstack/react-query";

import { RoleListPane } from "@/components/iam/RoleListPane";
import { RolesCreateManifestProvider } from "@/components/iam/roles-create-manifest-context";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { resolveContext } from "@/lib/latch";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type RolesLayoutProps = {
  children: React.ReactNode;
};

const RolesLayout = async ({ children }: RolesLayoutProps) => {
  await requireAuth(routes.roles.list);
  const [dehydratedState, { manifest: createManifest }] = await Promise.all([
    prefetchSurfaceList("role_list"),
    resolveContext({ surfaceId: "role_list" }),
  ]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <RolesCreateManifestProvider manifest={createManifest}>
        <MasterDetailShell list={<RoleListPane createManifest={createManifest} />}>
          {children}
        </MasterDetailShell>
      </RolesCreateManifestProvider>
    </HydrationBoundary>
  );
};

export default RolesLayout;
