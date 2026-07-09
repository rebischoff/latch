import { HydrationBoundary } from "@tanstack/react-query";

import { SpecUnitTable } from "@/components/catalog/SpecUnitTable";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const SpecUnitsPage = async () => {
  await requireAuth(routes.specUnits);
  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("spec_unit_table"),
    prefetchSurfaceList("spec_unit_table"),
  ]);

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <SpecUnitTable manifest={manifest} />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default SpecUnitsPage;
