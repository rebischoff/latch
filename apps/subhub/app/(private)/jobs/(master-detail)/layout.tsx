import { HydrationBoundary } from "@tanstack/react-query";

import { JobList } from "@/components/jobs/JobList";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { resolveContext } from "@/lib/latch";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type JobsLayoutProps = {
  children: React.ReactNode;
};

const JobsLayout = async ({ children }: JobsLayoutProps) => {
  await requireAuth(routes.jobs.list);
  const [dehydratedState, { manifest: createManifest }] = await Promise.all([
    prefetchSurfaceList("job_list"),
    resolveContext({ surfaceId: "job_detail", entityId: "new" }),
  ]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<JobList createManifest={createManifest} />}>
        {children}
      </MasterDetailShell>
    </HydrationBoundary>
  );
};

export default JobsLayout;
