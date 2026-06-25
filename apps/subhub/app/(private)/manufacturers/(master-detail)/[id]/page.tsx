import { HydrationBoundary } from "@tanstack/react-query";

import { ManufacturerDetailForm } from "@/components/manufacturers/ManufacturerDetailForm";
import { parseReturnContext } from "@/lib/picker-return-context";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchSurfaceCreate,
  prefetchSurfaceDetail,
} from "@/lib/surfaces/prefetch-surface-query";

type ManufacturerDetailPageProps = {
  params: Promise<{ id: string }>;
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

const ManufacturerDetailPage = async ({
  params,
  searchParams,
}: ManufacturerDetailPageProps) => {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const { isCreate, returnTo, returnField } = parseReturnContext(
    toSearchParams(resolvedSearchParams),
  );

  await requireAuth(routes.manufacturers.detail(id));

  if (isCreate) {
    const { state, manifest } = await prefetchSurfaceCreate("manufacturer_detail", id);

    return (
      <HydrationBoundary state={state}>
        <ManufacturerDetailForm
          manufacturerId={id}
          manifest={manifest}
          isCreate
          returnTo={returnTo}
          returnField={returnField}
        />
      </HydrationBoundary>
    );
  }

  const { state, manifest } = await prefetchSurfaceDetail("manufacturer_detail", id);

  return (
    <HydrationBoundary state={state}>
      <ManufacturerDetailForm manufacturerId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default ManufacturerDetailPage;
