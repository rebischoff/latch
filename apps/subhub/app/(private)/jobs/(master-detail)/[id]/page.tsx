import { HydrationBoundary } from "@tanstack/react-query";

import { JobDetailForm } from "@/components/jobs/JobDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import {
  prefetchJobSitePicker,
  prefetchSurfaceCreate,
  prefetchSurfaceDetail,
  resolveEstimateDetailLinkAccess,
  resolveSiteDetailLinkAccess,
} from "@/lib/surfaces/prefetch-surface-query";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ create?: string }>;
};

const JobDetailPage = async ({ params, searchParams }: JobDetailPageProps) => {
  const { id } = await params;
  const { create } = await searchParams;
  const isCreate = create === "1";

  await requireAuth(routes.jobs.detail(id));
  const [canNavigateSite, canNavigateEstimate] = await Promise.all([
    resolveSiteDetailLinkAccess(),
    resolveEstimateDetailLinkAccess(),
  ]);

  if (isCreate) {
    await prefetchJobSitePicker();
    const { state, manifest } = await prefetchSurfaceCreate("job_detail", id);

    return (
      <HydrationBoundary state={state}>
        <JobDetailForm
          jobId={id}
          manifest={manifest}
          isCreate
          canNavigateSite={canNavigateSite}
          canNavigateEstimate={canNavigateEstimate}
        />
      </HydrationBoundary>
    );
  }

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
