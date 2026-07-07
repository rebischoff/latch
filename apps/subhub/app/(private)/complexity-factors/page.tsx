import { HydrationBoundary } from "@tanstack/react-query";

import { CommercialCatalogTable } from "@/components/catalog/CommercialCatalogTable";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const ComplexityFactorsPage = async () => {
  await requireAuth(routes.complexityFactors);
  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("complexity_factor_table"),
    prefetchSurfaceList("complexity_factor_table"),
  ]);

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <CommercialCatalogTable
          surfaceId="complexity_factor_table"
          manifest={manifest}
          field="name"
          columns={["name", "factor_percent"]}
        />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default ComplexityFactorsPage;
