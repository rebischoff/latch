import { HydrationBoundary } from "@tanstack/react-query";

import { CommercialCatalogTable } from "@/components/catalog/CommercialCatalogTable";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const LaborRatesPage = async () => {
  await requireAuth(routes.laborRates);
  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("labor_rate_type_table"),
    prefetchSurfaceList("labor_rate_type_table"),
  ]);

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <CommercialCatalogTable
          surfaceId="labor_rate_type_table"
          manifest={manifest}
          field="name"
          columns={["name", "rate_cents"]}
        />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default LaborRatesPage;
