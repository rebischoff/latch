import { HydrationBoundary } from "@tanstack/react-query";

import { PartDetailForm } from "@/components/parts/PartDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchManufacturerPicker,
  prefetchSurfaceCreate,
  prefetchSurfaceDetail,
  prefetchVendorPicker,
  resolvePartLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type PartDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ create?: string }>;
};

const PartDetailPage = async ({ params, searchParams }: PartDetailPageProps) => {
  const { id } = await params;
  const { create } = await searchParams;
  const isCreate = create === "1";

  await requireAuth(routes.parts.detail(id));
  const linkAccess = await resolvePartLinkAccess();

  if (isCreate) {
    await Promise.all([prefetchManufacturerPicker(), prefetchVendorPicker()]);
    const { state, manifest } = await prefetchSurfaceCreate("part_detail", id);

    return (
      <HydrationBoundary state={state}>
        <PartDetailForm
          partId={id}
          manifest={manifest}
          isCreate
          canNavigateManufacturer={linkAccess.manufacturer}
          canNavigateVendor={linkAccess.vendor}
          canCreateManufacturer={linkAccess.canCreateManufacturer}
        />
      </HydrationBoundary>
    );
  }

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
