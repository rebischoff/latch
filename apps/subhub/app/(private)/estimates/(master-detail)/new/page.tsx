import { HydrationBoundary } from "@tanstack/react-query";

import { EstimateDetailForm } from "@/components/estimates/EstimateDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchEstimateSitePicker,
  prefetchSurfaceCreate,
  resolveSiteDetailLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

const EstimateCreatePage = async () => {
  await requireAuth(routes.estimates.new);
  const canNavigateSite = await resolveSiteDetailLinkAccess();

  await prefetchEstimateSitePicker();
  const { state, manifest } = await prefetchSurfaceCreate("estimate_detail", "new");

  return (
    <HydrationBoundary state={state}>
      <EstimateDetailForm
        estimateId="new"
        manifest={manifest}
        canNavigateSite={canNavigateSite}
      />
    </HydrationBoundary>
  );
};

export default EstimateCreatePage;
