import { isNotFoundError } from "@latch/contracts";
import { Suspense } from "react";

import { JobsSplitView } from "@/components/jobs/JobsSplitView";
import { loadProjectedJobDetail } from "@/lib/jobs/load-detail";
import { getJobsDal, resolveContext } from "@/lib/latch";

export const dynamic = "force-dynamic";

type JobsPageProps = {
  searchParams: Promise<{ id?: string }>;
};

const fetchJobList = async () => {
  const listCtx = await resolveContext({ surfaceId: "job_list" });
  const { rows, total } = getJobsDal().list(listCtx);
  return { rows, total, manifest: listCtx.manifest };
};

const JobsPageContent = async ({ selectedId }: { selectedId?: string }) => {
  const { rows, total, manifest } = await fetchJobList();

  if (!selectedId) {
    return (
      <JobsSplitView
        listRows={rows}
        listTotal={total}
        listManifest={manifest}
      />
    );
  }

  if (!rows.some((row) => row.id === selectedId)) {
    return (
      <JobsSplitView
        listRows={rows}
        listTotal={total}
        listManifest={manifest}
        selectedId={selectedId}
        notFound
      />
    );
  }

  try {
    const { ctx, job, submitterOpenPendingId } =
      await loadProjectedJobDetail(selectedId);
    const customerDetailManifest = job.customer_ref
      ? (
          await resolveContext({
            surfaceId: "customer_detail",
            entityId: job.customer_ref.id,
          })
        ).manifest
      : undefined;
    return (
      <JobsSplitView
        listRows={rows}
        listTotal={total}
        listManifest={manifest}
        selectedId={selectedId}
        detail={{
          job,
          manifest: ctx.manifest,
          customerDetailManifest,
          submitterOpenPendingId,
        }}
      />
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return (
        <JobsSplitView
          listRows={rows}
          listTotal={total}
          listManifest={manifest}
          selectedId={selectedId}
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
    <Suspense
      fallback={
        <JobsSplitView selectedId={id} listLoading />
      }
    >
      <JobsPageContent selectedId={id} />
    </Suspense>
  );
}
