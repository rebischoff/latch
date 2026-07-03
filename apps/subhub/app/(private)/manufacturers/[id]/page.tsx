import { HydrationBoundary } from "@tanstack/react-query";

import { ManufacturerDetailForm } from "@/components/manufacturers/ManufacturerDetailForm";
import { toSearchParams } from "@/lib/next-search-params";
import { parseReturnContext } from "@/lib/picker-return-context";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceCreate, prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type ManufacturerIdPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ManufacturerIdPage = async ({ params, searchParams }: ManufacturerIdPageProps) => {
  const { id } = await params;

  if (id === "new") {
    const resolvedSearchParams = await searchParams;
    const { returnTo, returnField } = parseReturnContext(
      toSearchParams(resolvedSearchParams),
    );

    await requireAuth(routes.manufacturers.new);
    const { state, manifest } = await prefetchSurfaceCreate("manufacturer_detail", "new");

    return (
      <HydrationBoundary state={state}>
        <ManufacturerDetailForm
          manufacturerId="new"
          manifest={manifest}
          returnTo={returnTo}
          returnField={returnField}
        />
      </HydrationBoundary>
    );
  }

  await requireAuth(routes.manufacturers.detail(id));
  const { state, manifest } = await prefetchSurfaceDetail("manufacturer_detail", id);

  return (
    <HydrationBoundary state={state}>
      <ManufacturerDetailForm manufacturerId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default ManufacturerIdPage;
