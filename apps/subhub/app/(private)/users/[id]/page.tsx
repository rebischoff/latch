import { HydrationBoundary } from "@tanstack/react-query";

import { UserDetailForm } from "@/components/iam/UserDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

const UserDetailPage = async ({ params }: UserDetailPageProps) => {
  const { id } = await params;
  await requireAuth(routes.users.detail(id));

  const { state, manifest } = await prefetchSurfaceDetail(
    "user_roles_detail",
    id,
    ["role_list"],
  );

  return (
    <HydrationBoundary state={state}>
      <UserDetailForm userId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default UserDetailPage;
