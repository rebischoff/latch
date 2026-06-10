"use server";

import { revalidatePath } from "next/cache";

import { isLatchError } from "@latch/contracts";

import { ensureAuditWriter } from "@/lib/audit-bootstrap";
import { getPool } from "@/lib/db";
import { buildRoleDetailContext } from "@/lib/iam/role-detail-context";
import {
  createRoleDetailDalForPool,
} from "@/lib/iam/repository";
import { getRequestPrincipal } from "@/lib/request-principal";
import { spikePolicyRegistry } from "@/lib/policy-registry";

export type RoleActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

const mapRoleActionError = (error: unknown): RoleActionResult<never> => {
  if (isLatchError(error)) {
    return { ok: false, error: error.message, status: error.statusCode };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message, status: 500 };
  }
  return { ok: false, error: "Unexpected error", status: 500 };
};

const revalidateRolePaths = (roleId?: string): void => {
  revalidatePath("/", "layout");
  revalidatePath("/roles");
  if (roleId) {
    revalidatePath(`/roles/${roleId}`);
  }
};

const roleDal = () =>
  createRoleDetailDalForPool(getPool(), { registry: spikePolicyRegistry });

export const createRoleAction = async (
  displayName: string,
): Promise<RoleActionResult<{ id: string }>> => {
  try {
    ensureAuditWriter();
    const pool = getPool();
    const principal = await getRequestPrincipal();
    const ctx = await buildRoleDetailContext(pool, principal);
    const created = await roleDal().createRole(ctx, { display_name: displayName });
    revalidateRolePaths(created.id);
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return mapRoleActionError(error);
  }
};

export const patchRoleAction = async (
  roleId: string,
  body: unknown,
): Promise<RoleActionResult> => {
  try {
    ensureAuditWriter();
    const pool = getPool();
    const principal = await getRequestPrincipal();
    const ctx = await buildRoleDetailContext(pool, principal);
    await roleDal().patchRole(ctx, roleId, body);
    revalidateRolePaths(roleId);
    return { ok: true, data: undefined };
  } catch (error) {
    return mapRoleActionError(error);
  }
};

export const deleteRoleAction = async (
  roleId: string,
): Promise<RoleActionResult> => {
  try {
    ensureAuditWriter();
    const pool = getPool();
    const principal = await getRequestPrincipal();
    const ctx = await buildRoleDetailContext(pool, principal);
    await roleDal().deleteRole(ctx, roleId);
    revalidateRolePaths();
    return { ok: true, data: undefined };
  } catch (error) {
    return mapRoleActionError(error);
  }
};
