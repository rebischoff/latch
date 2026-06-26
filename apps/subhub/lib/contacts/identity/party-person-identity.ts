import { ConflictError, ValidationError } from "@latch/contracts";
import type { Pool, PoolClient } from "pg";

import { isUniqueViolation } from "../../sites/repository/sql-utils";
import { loadPartyEmails } from "../repository";

export type ProvisionLinkedDbUserInput = {
  login_name: string;
  password_hash?: string;
  role_ids?: string[];
};

const loadPersonLoginLink = async (
  client: Pool | PoolClient,
  partyId: string,
): Promise<string | null> => {
  const result = await client.query<{ latch_user_id: string | null }>(
    `SELECT latch_user_id FROM party_person WHERE party_id = $1`,
    [partyId],
  );
  return result.rows[0]?.latch_user_id ?? null;
};

const findLoginEmailAddress = async (
  client: Pool | PoolClient,
  partyId: string,
): Promise<string | null> => {
  const result = await client.query<{ address: string }>(
    `SELECT address
     FROM party_email
     WHERE party_id = $1 AND is_login_email = true
     ORDER BY sort_order, id
     LIMIT 1`,
    [partyId],
  );
  return result.rows[0]?.address ?? null;
};

const assertLoginEmailAvailable = async (
  client: PoolClient,
  loginEmail: string,
  excludeUserId?: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id
     FROM latch_users
     WHERE login_email = $1
       AND ($2::text IS NULL OR id <> $2)`,
    [loginEmail, excludeUserId ?? null],
  );

  if (result.rows.length > 0) {
    throw new ConflictError("Login email is already in use");
  }
};

const copyLoginEmailTx = async (
  client: PoolClient,
  latchUserId: string,
  loginEmail: string | null,
): Promise<void> => {
  if (!loginEmail) {
    await client.query(
      `UPDATE latch_users SET login_email = NULL WHERE id = $1`,
      [latchUserId],
    );
    return;
  }

  await assertLoginEmailAvailable(client, loginEmail, latchUserId);
  await client.query(
    `UPDATE latch_users SET login_email = $2 WHERE id = $1`,
    [latchUserId, loginEmail],
  );
};

/** Sync designated login email row → latch_users.login_email when person is linked. */
export const syncLoginEmailFromEmailsTx = async (
  client: PoolClient,
  partyId: string,
): Promise<void> => {
  const latchUserId = await loadPersonLoginLink(client, partyId);
  if (!latchUserId) {
    return;
  }

  const loginEmail = await findLoginEmailAddress(client, partyId);
  await copyLoginEmailTx(client, latchUserId, loginEmail);
};

export const syncLoginEmailFromEmails = async (
  pool: Pool,
  partyId: string,
): Promise<void> => {
  const latchUserId = await loadPersonLoginLink(pool, partyId);
  if (!latchUserId) {
    return;
  }

  const emails = await loadPartyEmails(pool, partyId);
  const loginRows = emails.filter((row) => row.is_login_email);
  if (loginRows.length > 1) {
    throw new ValidationError("At most one login email per party");
  }

  const loginEmail = loginRows[0]?.address ?? null;
  if (loginEmail) {
    await pool.query(
      `SELECT id FROM latch_users WHERE login_email = $1 AND id <> $2`,
      [loginEmail, latchUserId],
    ).then((result) => {
      if (result.rows.length > 0) {
        throw new ConflictError("Login email is already in use");
      }
    });
    await pool.query(`UPDATE latch_users SET login_email = $2 WHERE id = $1`, [
      latchUserId,
      loginEmail,
    ]);
  } else {
    await pool.query(`UPDATE latch_users SET login_email = NULL WHERE id = $1`, [
      latchUserId,
    ]);
  }
};

const insertLinkedLatchUserTx = async (
  client: PoolClient,
  partyId: string,
  input: ProvisionLinkedDbUserInput,
): Promise<string> => {
  const person = await client.query<{ party_id: string }>(
    `SELECT party_id FROM party_person WHERE party_id = $1`,
    [partyId],
  );
  if (person.rows.length === 0) {
    throw new ValidationError("Party is not a person", {
      field: "profile",
      code: "not_person",
    });
  }

  const existingLink = await loadPersonLoginLink(client, partyId);
  if (existingLink) {
    throw new ConflictError("Person already has a login user");
  }

  const loginEmail = await findLoginEmailAddress(client, partyId);
  if (loginEmail) {
    await assertLoginEmailAvailable(client, loginEmail);
  }

  const userResult = await client.query<{ id: string }>(
    input.password_hash
      ? `INSERT INTO latch_users (id, login_name, login_email, password_hash, must_change_password)
         VALUES (gen_random_uuid()::text, $1, $2, $3, true)
         RETURNING id`
      : `INSERT INTO latch_users (id, login_name, login_email)
         VALUES (gen_random_uuid()::text, $1, $2)
         RETURNING id`,
    input.password_hash
      ? [input.login_name.trim(), loginEmail, input.password_hash]
      : [input.login_name.trim(), loginEmail],
  );

  const latchUserId = userResult.rows[0]?.id;
  if (!latchUserId) {
    throw new Error("Failed to create latch user");
  }

  await client.query(
    `UPDATE party_person SET latch_user_id = $2 WHERE party_id = $1`,
    [partyId, latchUserId],
  );

  const roleIds = input.role_ids ?? [];
  for (const roleId of roleIds) {
    await client.query(
      `INSERT INTO latch_user_roles (user_id, role_id) VALUES ($1, $2::uuid)`,
      [latchUserId, roleId],
    );
  }

  if (roleIds.length > 0) {
    await client.query(
      `UPDATE latch_policy_version SET version = version + 1 WHERE id = 1`,
    );
  }

  return latchUserId;
};

/** Create latch_users, link party_person, optional roles; sync login email when designated. */
export const provisionLinkedDbUser = async (
  pool: Pool,
  actorId: string,
  partyId: string,
  input: ProvisionLinkedDbUserInput,
): Promise<{ latch_user_id: string }> => {
  const { withPermissionDb } = await import("@latch/pg-session");

  try {
    return await withPermissionDb(pool, actorId, async (client) => {
      const latchUserId = await insertLinkedLatchUserTx(client, partyId, input);
      return { latch_user_id: latchUserId };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Login name or email is already in use");
    }
    throw error;
  }
};
