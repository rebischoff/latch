import { HydrationBoundary } from "@tanstack/react-query";

import { PartList } from "@/components/parts/PartList";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { resolveContext } from "@/lib/latch";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type PartsLayoutProps = {
  children: React.ReactNode;
};

const PartsLayout = async ({ children }: PartsLayoutProps) => {
  await requireAuth(routes.parts.list);
  const [dehydratedState, { manifest: createManifest }] = await Promise.all([
    prefetchSurfaceList("part_list"),
    resolveContext({ surfaceId: "part_detail", entityId: "new" }),
  ]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<PartList createManifest={createManifest} />}>
        {children}
      </MasterDetailShell>
    </HydrationBoundary>
  );
};

export default PartsLayout;
