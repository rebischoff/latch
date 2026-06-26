import { HydrationBoundary } from "@tanstack/react-query";

import { PartDetailForm } from "@/components/parts/PartDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchManufacturerPicker,
  prefetchSurfaceCreate,
  prefetchVendorPicker,
  resolvePartLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

const PartCreatePage = async () => {
  await requireAuth(routes.parts.new);
  const linkAccess = await resolvePartLinkAccess();

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
};

export default PartCreatePage;
