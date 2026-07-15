import { HydrationBoundary } from "@tanstack/react-query";

import { JobDetailForm } from "@/components/jobs/JobDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchJobSitePicker,
  prefetchSurfaceCreate,
  prefetchSurfaceDetail,
  resolveEstimateDetailLinkAccess,
  resolveSiteCreateAccess,
  resolveSiteDetailLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type JobIdPageProps = {
  params: Promise<{ id: string }>;
};

const JobIdPage = async ({ params }: JobIdPageProps) => {
  const { id } = await params;

  if (id === "new") {
    await requireAuth(routes.jobs.new);
    const [canNavigateSite, canNavigateEstimate, canCreateSite] = await Promise.all([
      resolveSiteDetailLinkAccess(),
      resolveEstimateDetailLinkAccess(),
      resolveSiteCreateAccess(),
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
          canCreateSite={canCreateSite}
        />
      </HydrationBoundary>
    );
  }

  await requireAuth(routes.jobs.detail(id));
  const [canNavigateSite, canNavigateEstimate, canCreateSite] = await Promise.all([
    resolveSiteDetailLinkAccess(),
    resolveEstimateDetailLinkAccess(),
    resolveSiteCreateAccess(),
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
        canCreateSite={canCreateSite}
      />
    </HydrationBoundary>
  );
};

export default JobIdPage;
