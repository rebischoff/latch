import { HydrationBoundary } from "@tanstack/react-query";

import { ManufacturerDetailForm } from "@/components/manufacturers/ManufacturerDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type ManufacturerDetailPageProps = {
  params: Promise<{ id: string }>;
};

const ManufacturerDetailPage = async ({ params }: ManufacturerDetailPageProps) => {
  const { id } = await params;

  await requireAuth(routes.manufacturers.detail(id));
  const { state, manifest } = await prefetchSurfaceDetail("manufacturer_detail", id);

  return (
    <HydrationBoundary state={state}>
      <ManufacturerDetailForm manufacturerId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default ManufacturerDetailPage;
