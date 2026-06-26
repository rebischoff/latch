import { HydrationBoundary } from "@tanstack/react-query";

import { JobDetailForm } from "@/components/jobs/JobDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchJobSitePicker,
  prefetchSurfaceDetail,
  resolveEstimateDetailLinkAccess,
  resolveSiteDetailLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

const JobDetailPage = async ({ params }: JobDetailPageProps) => {
  const { id } = await params;

  await requireAuth(routes.jobs.detail(id));
  const [canNavigateSite, canNavigateEstimate] = await Promise.all([
    resolveSiteDetailLinkAccess(),
    resolveEstimateDetailLinkAccess(),
  ]);

  await prefetchJobSitePicker();
  const { state, manifest } = await prefetchSurfaceDetail("job_detail", id);

  return (
    <HydrationBoundary state={state}>
      <JobDetailForm
        jobId={id}
        manifest={manifest}
        canNavigateSite={canNavigateSite}
        canNavigateEstimate={canNavigateEstimate}
      />
    </HydrationBoundary>
  );
};

export default JobDetailPage;
