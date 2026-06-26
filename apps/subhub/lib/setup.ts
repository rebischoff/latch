import { hashLatchPassword } from "@latch/adapter-better-auth";
import type { Pool, PoolClient } from "pg";
import { cache } from "react";

import { getPool } from "./db";

export type SetupInput = {
  loginName: string;
  password: string;
};

export type SetupResult = {
  userId: string;
};

type SetupStateRow = {
  no_users: boolean;
  setup_complete: boolean;
};

const SETUP_STATE_SQL = `
  SELECT
    NOT EXISTS (SELECT 1 FROM latch_users) AS no_users,
    COALESCE(
      (SELECT setup_complete FROM latch_app_config WHERE id = 1),
      false
    ) AS setup_complete
`;

const insertMasterUser = async (
  client: PoolClient,
  loginName: string,
  passwordHash: string,
): Promise<string> => {
  const userResult = await client.query<{ id: string }>(
    `INSERT INTO latch_users (id, login_name, password_hash, must_change_password)
     VALUES (gen_random_uuid()::text, $1, $2, false)
     RETURNING id`,
    [loginName, passwordHash],
  );

  const userId = userResult.rows[0]?.id;
  if (!userId) {
    throw new Error("Failed to create master user");
  }

  const rolesResult = await client.query<{ id: string }>(
    `SELECT id::text AS id
     FROM latch_roles
     WHERE role_class IN ('system_data', 'system_iam')`,
  );

  for (const role of rolesResult.rows) {
    await client.query(
      `INSERT INTO latch_user_roles (user_id, role_id) VALUES ($1, $2::uuid)`,
      [userId, role.id],
    );
  }

  await client.query(
    `UPDATE latch_app_config SET setup_complete = true WHERE id = 1`,
  );
  await client.query(
    `UPDATE latch_policy_version SET version = version + 1 WHERE id = 1`,
  );

  return userId;
};

/** When setup has completed, skip the DB probe for the process lifetime. */
let setupCompleteCache: boolean | undefined;
let setupInflight: Promise<boolean> | undefined;

export const readSetupState = async (
  pool: Pool,
): Promise<{ needsSetup: boolean }> => {
  const result = await pool.query<SetupStateRow>(SETUP_STATE_SQL);
  const row = result.rows[0];

  return {
    needsSetup: Boolean(row?.no_users && !row?.setup_complete),
  };
};

/** True when no users exist and first-run setup has not completed. */
export const needsSetup = cache(async (): Promise<boolean> => {
  if (setupCompleteCache) {
    return false;
  }
  if (setupInflight) {
    return setupInflight;
  }
  setupInflight = readSetupState(getPool())
    .then(({ needsSetup: pending }) => {
      if (!pending) {
        setupCompleteCache = true;
      }
      return pending;
    })
    .finally(() => {
      setupInflight = undefined;
    });
  return setupInflight;
});

/** Create master user + system role assignments; mark setup complete. */
export const completeSetup = async (
  input: SetupInput,
): Promise<SetupResult> => {
  if (!(await needsSetup())) {
    throw new SetupNotAllowedError("Setup already completed");
  }

  const pool = getPool();
  const client = await pool.connect();
  const passwordHash = await hashLatchPassword(input.password);

  let userId: string;
  try {
    await client.query("BEGIN");
    userId = await insertMasterUser(client, input.loginName, passwordHash);
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure on broken connection
    }
    throw error;
  } finally {
    client.release();
  }

  setupCompleteCache = true;
  return { userId };
};

export class SetupNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupNotAllowedError";
  }
}
