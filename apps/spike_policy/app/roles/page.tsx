import { surfaceAllows } from "@latch/contracts";

import { AccessDeniedPanel } from "@/app/components/access-denied-panel";
import { RolesWorkspace } from "@/app/components/roles-workspace";
import { fixtureGrantMatrixSurfaces } from "@/lib/grant-matrix-vocabulary";
import { getPool } from "@/lib/db";
import { listRolesFromPg } from "@/lib/iam/list-roles";
import { buildRoleDetailContext } from "@/lib/iam/role-detail-context";
import { createRoleDetailDalForPool } from "@/lib/iam/repository";
import { spikePolicyRegistry } from "@/lib/policy-registry";
import { getRequestPrincipal } from "@/lib/request-principal";

type RolesPageProps = {
  searchParams: Promise<{ id?: string }>;
};

const RolesPage = async ({ searchParams }: RolesPageProps) => {
  const { id: requestedId } = await searchParams;
  const pool = getPool();
  const principal = await getRequestPrincipal();
  const ctx = await buildRoleDetailContext(pool, principal);

  if (!surfaceAllows(ctx.manifest, "read")) {
    return <AccessDeniedPanel surfaceLabel="Roles" />;
  }

  const roles = await listRolesFromPg(pool);
  const canManage = surfaceAllows(ctx.manifest, "write");
  const selectedId =
    requestedId && roles.some((role) => role.id === requestedId)
      ? requestedId
      : (roles[0]?.id ?? null);

  const dal = createRoleDetailDalForPool(pool, {
    registry: spikePolicyRegistry,
  });

  const role = selectedId ? await dal.getRole(ctx, selectedId) : null;
  const vocabulary = fixtureGrantMatrixSurfaces(spikePolicyRegistry);

  return (
    <RolesWorkspace
      roles={roles}
      selectedId={selectedId}
      role={role}
      vocabulary={vocabulary}
      canManage={canManage}
    />
  );
};

export default RolesPage;
