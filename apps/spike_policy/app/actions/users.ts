"use server";

import type { Manifest, SurfaceId } from "@latch/contracts";
import { isLatchError } from "@latch/contracts";
import { revalidatePath } from "next/cache";

import { ensureAuditWriter } from "@/lib/audit-bootstrap";
import { getPool } from "@/lib/db";
import { resolveAllManifests } from "@/lib/iam-user/resolve-all-manifests";
import {
  createUserRolesDetailDalForPool,
} from "@/lib/iam-user/repository";
import type { ProjectedUserRolesDetail } from "@/lib/iam-user/project";
import { buildUserRolesDetailContext } from "@/lib/iam-user/user-detail-context";
import type { UserCreateInput } from "@/lib/iam-user/user-form";
import { spikePolicyRegistry } from "@/lib/policy-registry";
import { getRequestPrincipal } from "@/lib/request-principal";

export type UserActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

const mapUserActionError = (error: unknown): UserActionResult<never> => {
  if (isLatchError(error)) {
    return { ok: false, error: error.message, status: error.statusCode };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message, status: 500 };
  }
  return { ok: false, error: "Unexpected error", status: 500 };
};

const revalidateUserPaths = (userId?: string): void => {
  revalidatePath("/", "layout");
  revalidatePath("/users");
  if (userId) {
    revalidatePath(`/users/${userId}`);
  }
};

const userDal = () => createUserRolesDetailDalForPool(getPool());

export type PatchUserAssignmentsResult = {
  user: ProjectedUserRolesDetail;
  manifests: Record<SurfaceId, Manifest>;
};

export type CreateUserResult = {
  user: ProjectedUserRolesDetail;
  manifests: Record<SurfaceId, Manifest>;
};

export const createUserAction = async (
  input: UserCreateInput,
): Promise<UserActionResult<CreateUserResult>> => {
  try {
    ensureAuditWriter();
    const pool = getPool();
    const principal = await getRequestPrincipal();
    const ctx = await buildUserRolesDetailContext(pool, principal);
    const user = await userDal().createUser(ctx, input);
    const manifests = await resolveAllManifests(pool, user.id, spikePolicyRegistry);
    revalidateUserPaths(user.id);
    return { ok: true, data: { user, manifests } };
  } catch (error) {
    return mapUserActionError(error);
  }
};

export const patchUserAssignmentsAction = async (
  userId: string,
  roleAssignments: string[],
): Promise<UserActionResult<PatchUserAssignmentsResult>> => {
  try {
    ensureAuditWriter();
    const pool = getPool();
    const principal = await getRequestPrincipal();
    const ctx = await buildUserRolesDetailContext(pool, principal);
    const user = await userDal().patchUserRoles(ctx, userId, {
      role_assignments: roleAssignments,
    });
    const manifests = await resolveAllManifests(pool, userId, spikePolicyRegistry);
    revalidateUserPaths(userId);
    return { ok: true, data: { user, manifests } };
  } catch (error) {
    return mapUserActionError(error);
  }
};
