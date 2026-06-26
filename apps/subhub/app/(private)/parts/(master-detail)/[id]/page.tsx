import { HydrationBoundary } from "@tanstack/react-query";

import { PartDetailForm } from "@/components/parts/PartDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchManufacturerPicker,
  prefetchSurfaceDetail,
  prefetchVendorPicker,
  resolvePartLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type PartDetailPageProps = {
  params: Promise<{ id: string }>;
};

const PartDetailPage = async ({ params }: PartDetailPageProps) => {
  const { id } = await params;

  await requireAuth(routes.parts.detail(id));
  const linkAccess = await resolvePartLinkAccess();

  await Promise.all([prefetchManufacturerPicker(), prefetchVendorPicker()]);
  const { state, manifest } = await prefetchSurfaceDetail("part_detail", id);

  return (
    <HydrationBoundary state={state}>
      <PartDetailForm
        partId={id}
        manifest={manifest}
        canNavigateManufacturer={linkAccess.manufacturer}
        canNavigateVendor={linkAccess.vendor}
        canCreateManufacturer={linkAccess.canCreateManufacturer}
      />
    </HydrationBoundary>
  );
};

export default PartDetailPage;
