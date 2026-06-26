import {
  ForbiddenError,
  surfaceAllows,
  type SurfaceId,
} from "@latch/contracts";
import type { Pool } from "pg";

import { employeePartyHasLens } from "./contacts/repository/employee-write";
import { resolveContextFresh } from "./latch";
import { getPool } from "./db";
import { assertSurfaceRead } from "./surfaces/assert-surface-read";

export type ProvisionPersonState = {
  partyId: string;
  displayName: string;
  latchUserId: string | null;
  coveringSurfaceId: SurfaceId;
};

const loadPersonRow = async (
  pool: Pool,
  partyId: string,
): Promise<
  | {
      display_name: string;
      latch_user_id: string | null;
    }
  | undefined
> => {
  const result = await pool.query<{
    display_name: string;
    latch_user_id: string | null;
  }>(
    `SELECT p.display_name, pp.latch_user_id
     FROM party p
     INNER JOIN party_person pp ON pp.party_id = p.id
     WHERE p.id = $1`,
    [partyId],
  );

  return result.rows[0];
};

/** Resolve the person lens that covers `partyId` (v1: employee only). */
export const resolveCoveringPersonSurface = async (
  pool: Pool,
  partyId: string,
): Promise<SurfaceId | null> => {
  if (await employeePartyHasLens(pool, partyId)) {
    return "employee_detail";
  }

  return null;
};

export const loadProvisionPersonState = async (
  pool: Pool,
  partyId: string,
): Promise<ProvisionPersonState | null> => {
  const row = await loadPersonRow(pool, partyId);
  if (!row) {
    return null;
  }

  const coveringSurfaceId = await resolveCoveringPersonSurface(pool, partyId);
  if (!coveringSurfaceId) {
    return null;
  }

  return {
    partyId,
    displayName: row.display_name,
    latchUserId: row.latch_user_id,
    coveringSurfaceId,
  };
};

/** Returns null when GET `/users/new` should redirect to `/users`. */
export const resolveProvisionPersonState = async (
  linkPartyId: string | null | undefined,
): Promise<ProvisionPersonState | null> => {
  const partyId = linkPartyId?.trim();
  if (!partyId) {
    return null;
  }

  const pool = getPool();
  const state = await loadProvisionPersonState(pool, partyId);
  if (!state || state.latchUserId) {
    return null;
  }

  try {
    const ctx = await resolveContextFresh({
      surfaceId: state.coveringSurfaceId,
      entityId: partyId,
    });
    assertSurfaceRead(ctx);
    if (!surfaceAllows(ctx.manifest, "add_as_db_user")) {
      return null;
    }
  } catch {
    return null;
  }

  return state;
};

/** POST create — 403 when caller lacks provision access on the linked person. */
export const assertProvisionPersonAccess = async (
  linkPartyId: string,
): Promise<ProvisionPersonState> => {
  const pool = getPool();
  const state = await loadProvisionPersonState(pool, linkPartyId);
  if (!state) {
    throw new ForbiddenError();
  }

  if (state.latchUserId) {
    throw new ForbiddenError();
  }

  const ctx = await resolveContextFresh({
    surfaceId: state.coveringSurfaceId,
    entityId: linkPartyId,
  });
  assertSurfaceRead(ctx);
  if (!surfaceAllows(ctx.manifest, "add_as_db_user")) {
    throw new ForbiddenError();
  }

  return state;
};
