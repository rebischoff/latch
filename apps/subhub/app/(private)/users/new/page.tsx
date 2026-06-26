import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { UserCreateForm } from "@/components/iam/UserCreateForm";
import { routes } from "@/lib/nav-routes";
import {
  parseProvisionContext,
  PROVISION_USER_PARAMS,
} from "@/lib/provision-user-context";
import { resolveProvisionPersonState } from "@/lib/provision-user";
import { requireAuth } from "@/lib/require-auth";
import { resolveContext } from "@/lib/latch";
import { prefetchSurfaceCreate } from "@/lib/surfaces/prefetch-surface-query";

type UserCreatePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const readSearchParam = (
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | null => {
  const value = searchParams[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

const UserCreatePage = async ({ searchParams }: UserCreatePageProps) => {
  await requireAuth(routes.users.new);

  const params = await searchParams;
  const linkPartyId = readSearchParam(params, PROVISION_USER_PARAMS.linkPartyId);
  const fallbackReturnTo = linkPartyId
    ? routes.employees.detail(linkPartyId)
    : routes.users.list;
  const { safeReturnTo } = parseProvisionContext(
    {
      get: (name) => readSearchParam(params, name),
    },
    fallbackReturnTo,
  );

  const provisionState = await resolveProvisionPersonState(linkPartyId);
  if (!provisionState) {
    redirect(routes.users.list);
  }

  const [{ manifest }, { state }] = await Promise.all([
    resolveContext({ surfaceId: "user_list" }),
    prefetchSurfaceCreate("user_roles_detail", "new", ["role_list"]),
  ]);

  return (
    <HydrationBoundary state={state}>
      <UserCreateForm
        linkPartyId={provisionState.partyId}
        returnTo={safeReturnTo}
        personDisplayName={provisionState.displayName}
        manifest={manifest}
      />
    </HydrationBoundary>
  );
};

export default UserCreatePage;
