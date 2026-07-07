import { HydrationBoundary } from "@tanstack/react-query";

import { CommercialCatalogTable } from "@/components/catalog/CommercialCatalogTable";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const LaborPhasesPage = async () => {
  await requireAuth(routes.laborPhases);
  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("labor_phase_table"),
    prefetchSurfaceList("labor_phase_table"),
  ]);

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <CommercialCatalogTable
          surfaceId="labor_phase_table"
          manifest={manifest}
          field="name"
          columns={["name"]}
        />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default LaborPhasesPage;
