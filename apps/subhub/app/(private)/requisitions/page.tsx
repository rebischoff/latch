import { HydrationBoundary } from "@tanstack/react-query";

import { RequisitionList } from "@/components/requisitions/RequisitionList";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { loadSurfaceListQuery } from "@/lib/surfaces/load-surface-list";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

const RequisitionsPage = async () => {
  await requireAuth(routes.requisitions.list);

  const [{ manifest }, dehydratedState] = await Promise.all([
    loadSurfaceListQuery("job_material_request_list"),
    prefetchSurfaceList("job_material_request_list"),
  ]);

  void manifest;

  return (
    <PageScroll>
      <HydrationBoundary state={dehydratedState}>
        <RequisitionList />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default RequisitionsPage;
