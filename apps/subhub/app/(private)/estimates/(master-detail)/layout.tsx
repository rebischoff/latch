import { HydrationBoundary } from "@tanstack/react-query";

import { EstimateList } from "@/components/estimates/EstimateList";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { resolveContext } from "@/lib/latch";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type EstimatesLayoutProps = {
  children: React.ReactNode;
};

const EstimatesLayout = async ({ children }: EstimatesLayoutProps) => {
  await requireAuth(routes.estimates.list);
  const [dehydratedState, { manifest: createManifest }] = await Promise.all([
    prefetchSurfaceList("estimate_list"),
    resolveContext({ surfaceId: "estimate_detail", entityId: "new" }),
  ]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<EstimateList createManifest={createManifest} />}>
        {children}
      </MasterDetailShell>
    </HydrationBoundary>
  );
};

export default EstimatesLayout;
