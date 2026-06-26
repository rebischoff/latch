import { HydrationBoundary } from "@tanstack/react-query";

import { EstimateDetailForm } from "@/components/estimates/EstimateDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchEstimateSitePicker,
  prefetchSurfaceDetail,
  resolveSiteDetailLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type EstimateDetailPageProps = {
  params: Promise<{ id: string }>;
};

const EstimateDetailPage = async ({ params }: EstimateDetailPageProps) => {
  const { id } = await params;

  await requireAuth(routes.estimates.detail(id));
  const canNavigateSite = await resolveSiteDetailLinkAccess();

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
