import { HydrationBoundary } from "@tanstack/react-query";

import { SiteDetailForm } from "@/components/sites/SiteDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchSurfaceDetail,
  resolveHubLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type SiteDetailPageProps = {
  params: Promise<{ id: string }>;
};

const SiteDetailPage = async ({ params }: SiteDetailPageProps) => {
  const { id } = await params;

  await requireAuth(routes.sites.detail(id));
  const hubLinks = await resolveHubLinkAccess();

  const { state, manifest } = await prefetchSurfaceDetail("site_detail", id, [
    "customer_list",
  ]);

  return (
    <HydrationBoundary state={state}>
      <SiteDetailForm siteId={id} manifest={manifest} hubLinks={hubLinks} />
    </HydrationBoundary>
  );
};

export default SiteDetailPage;
