import { HydrationBoundary } from "@tanstack/react-query";

import { SiteDetailForm } from "@/components/sites/SiteDetailForm";
import { toSearchParams } from "@/lib/next-search-params";
import { parseReturnContext } from "@/lib/picker-return-context";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchSurfaceCreate,
  prefetchSurfaceDetail,
} from "@/lib/surfaces/prefetch-surface-query";

type SiteIdPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SiteIdPage = async ({ params, searchParams }: SiteIdPageProps) => {
  const { id } = await params;

  if (id === "new") {
    const resolvedSearchParams = await searchParams;
    const { returnTo, returnField } = parseReturnContext(
      toSearchParams(resolvedSearchParams),
    );

    await requireAuth(routes.sites.new);

    const { state, manifest } = await prefetchSurfaceCreate("site_detail", "new", [
      "customer_list",
    ]);

    return (
      <HydrationBoundary state={state}>
        <SiteDetailForm
          siteId="new"
          manifest={manifest}
          returnTo={returnTo}
          returnField={returnField}
        />
      </HydrationBoundary>
    );
  }

  await requireAuth(routes.sites.detail(id));

  const { state, manifest } = await prefetchSurfaceDetail("site_detail", id, [
    "customer_list",
  ]);

  return (
    <HydrationBoundary state={state}>
      <SiteDetailForm siteId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default SiteIdPage;
