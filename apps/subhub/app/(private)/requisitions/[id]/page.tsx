import { HydrationBoundary } from "@tanstack/react-query";

import { RequisitionDetailForm } from "@/components/requisitions/RequisitionDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceCreate, prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type RequisitionIdPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const RequisitionIdPage = async ({ params, searchParams }: RequisitionIdPageProps) => {
  const { id } = await params;

  if (id === "new") {
    const resolvedSearchParams = await searchParams;
    const jobId =
      typeof resolvedSearchParams.jobId === "string" ? resolvedSearchParams.jobId : undefined;
    const jobTitle =
      typeof resolvedSearchParams.jobTitle === "string"
        ? resolvedSearchParams.jobTitle
        : undefined;

    await requireAuth(routes.requisitions.new);
    const { state, manifest } = await prefetchSurfaceCreate("requested_order_detail", "new");

    return (
      <HydrationBoundary state={state}>
        <RequisitionDetailForm
          requisitionId="new"
          manifest={manifest}
          initialJobId={jobId}
          initialJobTitle={jobTitle}
        />
      </HydrationBoundary>
    );
  }

  await requireAuth(routes.requisitions.detail(id));
  const { state, manifest } = await prefetchSurfaceDetail("requested_order_detail", id);

  return (
    <HydrationBoundary state={state}>
      <RequisitionDetailForm requisitionId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default RequisitionIdPage;
