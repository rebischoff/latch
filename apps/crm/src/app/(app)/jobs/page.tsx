import { isNotFoundError } from "@latch/contracts";
import { Suspense } from "react";

import { JobsSplitView } from "@/components/jobs/JobsSplitView";
import {
  getJobsDal,
  listVisibleSeedJobIds,
  resolveContext,
} from "@/lib/latch";

export const dynamic = "force-dynamic";

type JobsPageProps = {
  searchParams: Promise<{ id?: string }>;
};

const JobsPageContent = async ({ selectedId }: { selectedId?: string }) => {
  const visibleJobIds = await listVisibleSeedJobIds();

  if (!selectedId) {
    return <JobsSplitView visibleJobIds={visibleJobIds} />;
  }

  if (!visibleJobIds.includes(selectedId)) {
    return (
      <JobsSplitView
        selectedId={selectedId}
        visibleJobIds={visibleJobIds}
        notFound
      />
    );
  }

  try {
    const ctx = await resolveContext({
      surfaceId: "job_detail",
      entityId: selectedId,
    });
    const job = getJobsDal().get(ctx, selectedId);
    return (
      <JobsSplitView
        selectedId={selectedId}
        visibleJobIds={visibleJobIds}
        detail={{ job, manifest: ctx.manifest }}
      />
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return (
        <JobsSplitView
          selectedId={selectedId}
          visibleJobIds={visibleJobIds}
          notFound
        />
      );
    }
    throw error;
  }
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const { id } = await searchParams;

  return (
    <Suspense fallback={<JobsSplitView selectedId={id} />}>
      <JobsPageContent selectedId={id} />
    </Suspense>
  );
}
