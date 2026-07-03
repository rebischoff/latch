import { HydrationBoundary } from "@tanstack/react-query";
import type { SurfaceId } from "@latch/contracts";
import { Suspense, type ReactNode } from "react";

import { MasterDetailSelectionProvider } from "@/components/shell/MasterDetailSelectionContext";
import { MasterDetailToolbarHost } from "@/components/shell/MasterDetailToolbarHost";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { SurfaceFormChromeProvider } from "@/components/surface/SurfaceFormChromeContext";
import type { MasterDetailSurfaceConfig } from "@/lib/hooks/use-master-detail-toolbar";
import { resolveContext } from "@/lib/latch";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";
import type { SurfaceListId } from "@/lib/surfaces/surface-loader-registry";

type MasterDetailChromeLayoutProps = {
  children: ReactNode;
  list: ReactNode;
  listRoute: string;
  listSurfaceId: SurfaceListId;
  config: MasterDetailSurfaceConfig;
};

const resolveCreateManifest = async (config: MasterDetailSurfaceConfig) => {
  const surfaceId = (config.createManifestSurfaceId ??
    config.detailSurfaceId) as SurfaceId;

  if (surfaceId.endsWith("_list")) {
    const { manifest } = await resolveContext({ surfaceId });
    return manifest;
  }

  const { manifest } = await resolveContext({
    surfaceId,
    entityId: "new",
  });
  return manifest;
};

export const MasterDetailChromeLayout = async ({
  children,
  list,
  listRoute,
  listSurfaceId,
  config,
}: MasterDetailChromeLayoutProps) => {
  await requireAuth(listRoute);
  const [dehydratedState, createManifest] = await Promise.all([
    prefetchSurfaceList(listSurfaceId),
    resolveCreateManifest(config),
  ]);

  return (
    <SurfaceFormChromeProvider>
      <MasterDetailSelectionProvider>
        <HydrationBoundary state={dehydratedState}>
          <MasterDetailShell list={list}>{children}</MasterDetailShell>
          <Suspense fallback={null}>
            <MasterDetailToolbarHost createManifest={createManifest} config={config} />
          </Suspense>
        </HydrationBoundary>
      </MasterDetailSelectionProvider>
    </SurfaceFormChromeProvider>
  );
};
