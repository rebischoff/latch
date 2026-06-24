import { HydrationBoundary } from "@tanstack/react-query";

import { EstimateDetailForm } from "@/components/estimates/EstimateDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchEstimateSitePicker,
  prefetchSurfaceCreate,
  prefetchSurfaceDetail,
  resolveSiteDetailLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type EstimateDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ create?: string }>;
};

const EstimateDetailPage = async ({ params, searchParams }: EstimateDetailPageProps) => {
  const { id } = await params;
  const { create } = await searchParams;
  const isCreate = create === "1";

  await requireAuth(routes.estimates.detail(id));
  const canNavigateSite = await resolveSiteDetailLinkAccess();

  if (isCreate) {
    await prefetchEstimateSitePicker();
    const { state, manifest } = await prefetchSurfaceCreate("estimate_detail", id);

    return (
      <HydrationBoundary state={state}>
        <EstimateDetailForm
          estimateId={id}
          manifest={manifest}
          isCreate
          canNavigateSite={canNavigateSite}
        />
      </HydrationBoundary>
    );
  }

  await prefetchEstimateSitePicker();
  const { state, manifest } = await prefetchSurfaceDetail("estimate_detail", id);

  return (
    <HydrationBoundary state={state}>
      <EstimateDetailForm
        estimateId={id}
        manifest={manifest}
        canNavigateSite={canNavigateSite}
      />
    </HydrationBoundary>
  );
};

export default EstimateDetailPage;
