import { HydrationBoundary } from "@tanstack/react-query";

import { ManufacturerList } from "@/components/manufacturers/ManufacturerList";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { resolveContext } from "@/lib/latch";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type ManufacturersLayoutProps = {
  children: React.ReactNode;
};

const ManufacturersLayout = async ({ children }: ManufacturersLayoutProps) => {
  await requireAuth(routes.manufacturers.list);
  const [dehydratedState, { manifest: createManifest }] = await Promise.all([
    prefetchSurfaceList("manufacturer_list"),
    resolveContext({ surfaceId: "manufacturer_detail", entityId: "new" }),
  ]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<ManufacturerList createManifest={createManifest} />}>
        {children}
      </MasterDetailShell>
    </HydrationBoundary>
  );
};

export default ManufacturersLayout;
