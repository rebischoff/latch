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

type PartIdPageProps = {
  params: Promise<{ id: string }>;
};

const PartIdPage = async ({ params }: PartIdPageProps) => {
  const { id } = await params;
  const linkAccess = await resolvePartLinkAccess();

  if (id === "new") {
    await requireAuth(routes.parts.new);

    await Promise.all([prefetchManufacturerPicker(), prefetchVendorPicker()]);
    const { state, manifest } = await prefetchSurfaceCreate("part_detail", "new");

    return (
      <HydrationBoundary state={state}>
        <PartDetailForm
          partId="new"
          manifest={manifest}
          canNavigateManufacturer={linkAccess.manufacturer}
          canNavigateVendor={linkAccess.vendor}
          canCreateManufacturer={linkAccess.canCreateManufacturer}
        />
      </HydrationBoundary>
    );
  }

  await requireAuth(routes.parts.detail(id));

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

export default PartIdPage;
