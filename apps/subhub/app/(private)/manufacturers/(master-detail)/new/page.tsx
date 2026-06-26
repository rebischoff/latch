import { HydrationBoundary } from "@tanstack/react-query";

import { ManufacturerDetailForm } from "@/components/manufacturers/ManufacturerDetailForm";
import { parseReturnContext } from "@/lib/picker-return-context";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceCreate } from "@/lib/surfaces/prefetch-surface-query";

type ManufacturerCreatePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const toSearchParams = (
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }
  return params;
};

const ManufacturerCreatePage = async ({ searchParams }: ManufacturerCreatePageProps) => {
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
};

export default ManufacturerCreatePage;
