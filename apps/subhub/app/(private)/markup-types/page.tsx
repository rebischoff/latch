import { HydrationBoundary } from "@tanstack/react-query";

import { CommercialCatalogTable } from "@/components/catalog/CommercialCatalogTable";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const MarkupTypesPage = async () => {
  await requireAuth(routes.markupTypes);
  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("markup_type_table"),
    prefetchSurfaceList("markup_type_table"),
  ]);

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <CommercialCatalogTable
          surfaceId="markup_type_table"
          manifest={manifest}
          field="name"
          columns={["name", "material_markup_percent", "labor_markup_percent"]}
        />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default MarkupTypesPage;
