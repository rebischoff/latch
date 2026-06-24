import { HydrationBoundary } from "@tanstack/react-query";

import { JobPartyRelationCatalog } from "@/components/catalog/JobPartyRelationCatalog";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const PartyRelationsPage = async () => {
  await requireAuth(routes.partyRelations);

  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("job_party_relation_table"),
    prefetchSurfaceList("job_party_relation_table"),
  ]);

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <JobPartyRelationCatalog manifest={manifest} />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default PartyRelationsPage;
