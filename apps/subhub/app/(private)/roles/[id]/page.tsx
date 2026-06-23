import { HydrationBoundary } from "@tanstack/react-query";

import { RoleDetailForm } from "@/components/iam/RoleDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type RoleDetailPageProps = {
  params: Promise<{ id: string }>;
};

const RoleDetailPage = async ({ params }: RoleDetailPageProps) => {
  const { id } = await params;
  await requireAuth(routes.roles.detail(id));

  const { state, manifest } = await prefetchSurfaceDetail("role_detail", id);

  return (
    <HydrationBoundary state={state}>
      <RoleDetailForm roleId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default RoleDetailPage;
