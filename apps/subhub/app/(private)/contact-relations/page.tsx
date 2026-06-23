import { HydrationBoundary } from "@tanstack/react-query";

import { PageScroll } from "@/components/shell/PageScroll";
import { SiteContactRelationCatalog } from "@/components/catalog/SiteContactRelationCatalog";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const ContactRelationsPage = async () => {
  await requireAuth(routes.contactRelations);

  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("site_contact_relation_table"),
    prefetchSurfaceList("site_contact_relation_table"),
  ]);

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <SiteContactRelationCatalog manifest={manifest} />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default ContactRelationsPage;
