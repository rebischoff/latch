import { HydrationBoundary } from "@tanstack/react-query";

import { EstimateDetailForm } from "@/components/estimates/EstimateDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchEstimateSitePicker,
  prefetchSurfaceCreate,
  prefetchSurfaceDetail,
  resolveSiteCreateAccess,
  resolveSiteDetailLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type EstimateIdPageProps = {
  params: Promise<{ id: string }>;
};

const EstimateIdPage = async ({ params }: EstimateIdPageProps) => {
  const { id } = await params;

  if (id === "new") {
    await requireAuth(routes.estimates.new);
    const [canNavigateSite, canCreateSite] = await Promise.all([
      resolveSiteDetailLinkAccess(),
      resolveSiteCreateAccess(),
    ]);

    await prefetchEstimateSitePicker();
    const { state, manifest } = await prefetchSurfaceCreate("estimate_detail", "new");

    return (
      <HydrationBoundary state={state}>
        <EstimateDetailForm
          estimateId="new"
          manifest={manifest}
          canNavigateSite={canNavigateSite}
          canCreateSite={canCreateSite}
        />
      </HydrationBoundary>
    );
  }

  await requireAuth(routes.estimates.detail(id));
  const [canNavigateSite, canCreateSite] = await Promise.all([
    resolveSiteDetailLinkAccess(),
    resolveSiteCreateAccess(),
  ]);

  await prefetchEstimateSitePicker();
  const { state, manifest } = await prefetchSurfaceDetail("estimate_detail", id);

  return (
    <HydrationBoundary state={state}>
      <EstimateDetailForm
        estimateId={id}
        manifest={manifest}
        canNavigateSite={canNavigateSite}
        canCreateSite={canCreateSite}
      />
    </HydrationBoundary>
  );
};

export default EstimateIdPage;
