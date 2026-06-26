import { HydrationBoundary } from "@tanstack/react-query";

import { JobDetailForm } from "@/components/jobs/JobDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchJobSitePicker,
  prefetchSurfaceCreate,
  resolveEstimateDetailLinkAccess,
  resolveSiteDetailLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

const JobCreatePage = async () => {
  await requireAuth(routes.jobs.new);
  const [canNavigateSite, canNavigateEstimate] = await Promise.all([
    resolveSiteDetailLinkAccess(),
    resolveEstimateDetailLinkAccess(),
  ]);

  await prefetchJobSitePicker();
  const { state, manifest } = await prefetchSurfaceCreate("job_detail", "new");

  return (
    <HydrationBoundary state={state}>
      <JobDetailForm
        jobId="new"
        manifest={manifest}
        canNavigateSite={canNavigateSite}
        canNavigateEstimate={canNavigateEstimate}
      />
    </HydrationBoundary>
  );
};

export default JobCreatePage;
