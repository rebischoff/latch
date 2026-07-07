import { HydrationBoundary } from "@tanstack/react-query";

import { CommercialCatalogTable } from "@/components/catalog/CommercialCatalogTable";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const IncidentalRatesPage = async () => {
  await requireAuth(routes.incidentalRates);
  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("incidental_rate_type_table"),
    prefetchSurfaceList("incidental_rate_type_table"),
  ]);

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <CommercialCatalogTable
          surfaceId="incidental_rate_type_table"
          manifest={manifest}
          field="name"
          columns={["name", "percent", "amount_cents"]}
        />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default IncidentalRatesPage;
