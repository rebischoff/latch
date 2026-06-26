import { HydrationBoundary } from "@tanstack/react-query";

import { RoleDetailForm } from "@/components/iam/RoleDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceCreate } from "@/lib/surfaces/prefetch-surface-query";

const RoleCreatePage = async () => {
  await requireAuth(routes.roles.new);

  const { state, manifest } = await prefetchSurfaceCreate("role_detail", "new");

  return (
    <HydrationBoundary state={state}>
      <RoleDetailForm roleId="new" manifest={manifest} />
    </HydrationBoundary>
  );
};

export default RoleCreatePage;
