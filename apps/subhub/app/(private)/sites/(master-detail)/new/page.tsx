import { HydrationBoundary } from "@tanstack/react-query";

import { SiteDetailForm } from "@/components/sites/SiteDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchSurfaceCreate,
  resolveHubLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

const SiteCreatePage = async () => {
  await requireAuth(routes.sites.new);
  const hubLinks = await resolveHubLinkAccess();

  const { state, manifest } = await prefetchSurfaceCreate("site_detail", "new", [
    "customer_list",
  ]);

  return (
    <HydrationBoundary state={state}>
      <SiteDetailForm siteId="new" manifest={manifest} hubLinks={hubLinks} />
    </HydrationBoundary>
  );
};

export default SiteCreatePage;
