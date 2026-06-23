import { HydrationBoundary } from "@tanstack/react-query";

import { SiteDetailForm } from "@/components/sites/SiteDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchSurfaceCreate,
  prefetchSurfaceDetail,
  resolveHubLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type SiteDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ create?: string }>;
};

const SiteDetailPage = async ({ params, searchParams }: SiteDetailPageProps) => {
  const { id } = await params;
  const { create } = await searchParams;
  const isCreate = create === "1";

  await requireAuth(routes.sites.detail(id));
  const hubLinks = await resolveHubLinkAccess();

  if (isCreate) {
    const { state, manifest } = await prefetchSurfaceCreate("site_detail", id, [
      "customer_list",
    ]);

    return (
      <HydrationBoundary state={state}>
        <SiteDetailForm
          siteId={id}
          manifest={manifest}
          isCreate
          hubLinks={hubLinks}
        />
      </HydrationBoundary>
    );
  }

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
