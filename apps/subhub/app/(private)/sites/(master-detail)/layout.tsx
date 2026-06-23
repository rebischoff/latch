import { HydrationBoundary } from "@tanstack/react-query";

import { SiteList } from "@/components/sites/SiteList";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { resolveContext } from "@/lib/latch";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type SitesLayoutProps = {
  children: React.ReactNode;
};

const SitesLayout = async ({ children }: SitesLayoutProps) => {
  await requireAuth(routes.sites.list);
  const [dehydratedState, { manifest: createManifest }] = await Promise.all([
    prefetchSurfaceList("site_list"),
    resolveContext({ surfaceId: "site_detail", entityId: "new" }),
  ]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<SiteList createManifest={createManifest} />}>
        {children}
      </MasterDetailShell>
    </HydrationBoundary>
  );
};

export default SitesLayout;
