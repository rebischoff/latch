import { fieldAllows, surfaceAllows } from "@latch/contracts";

import { AccessDeniedPanel } from "@/app/components/access-denied-panel";
import { UsersWorkspace } from "@/app/components/users-workspace";
import { getPool } from "@/lib/db";
import { listRolesFromPg } from "@/lib/iam/list-roles";
import { listUsersFromPg } from "@/lib/iam-user/list-users-pg";
import { resolveAllManifests } from "@/lib/iam-user/resolve-all-manifests";
import { createUserRolesDetailDalForPool } from "@/lib/iam-user/repository";
import { buildUserRolesDetailContext } from "@/lib/iam-user/user-detail-context";
import { spikePolicyRegistry } from "@/lib/policy-registry";
import { getRequestPrincipal } from "@/lib/request-principal";

const iamSurfaceIds = Object.values(spikePolicyRegistry)
  .filter((surface) => surface.kind === "iam")
  .map((surface) => surface.surface);

type UsersPageProps = {
  searchParams: Promise<{ id?: string }>;
};

const UsersPage = async ({ searchParams }: UsersPageProps) => {
  const { id: requestedId } = await searchParams;
  const pool = getPool();
  const principal = await getRequestPrincipal();
  const ctx = await buildUserRolesDetailContext(pool, principal);

  if (!surfaceAllows(ctx.manifest, "read")) {
    return <AccessDeniedPanel surfaceLabel="Users" />;
  }

  const users = await listUsersFromPg(pool);
  const defaultId =
    users.find((user) => user.id !== principal.id)?.id ?? users[0]?.id ?? null;
  const selectedId =
    requestedId && users.some((user) => user.id === requestedId)
      ? requestedId
      : defaultId;

  const dal = createUserRolesDetailDalForPool(pool);
  const canCreate = surfaceAllows(ctx.manifest, "write");
  const canWrite = fieldAllows(ctx.manifest, "role_assignments", "write");

  const [user, roles, manifests] = selectedId
    ? await Promise.all([
        dal.getUserRoles(ctx, selectedId),
        listRolesFromPg(pool),
        resolveAllManifests(pool, selectedId, spikePolicyRegistry),
      ])
    : [null, await listRolesFromPg(pool), null];

  const isSelf = selectedId !== null && principal.id === selectedId;

  return (
    <UsersWorkspace
      users={users}
      selectedId={selectedId}
      user={user}
      roles={roles}
      manifests={manifests}
      iamSurfaceIds={iamSurfaceIds}
      canCreate={canCreate}
      canWrite={canWrite}
      isSelf={isSelf}
    />
  );
};

export default UsersPage;
