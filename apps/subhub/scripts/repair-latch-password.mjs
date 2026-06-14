#!/usr/bin/env node
/**
 * One-off repair: set `latch_users.password_hash` for an existing user
 * created before migration 015. Usage:
 *   node scripts/repair-latch-password.mjs <login_name> <password>
 */
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const loginName = process.argv[2]?.trim();
const password = process.argv[3];

if (!loginName || !password) {
  console.error("Usage: node scripts/repair-latch-password.mjs <login_name> <password>");
  process.exit(1);
}

const databaseUrl =
  process.env.DATABASE_URL_DIRECT?.trim() ?? process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("DATABASE_URL or DATABASE_URL_DIRECT is required");
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const result = await pool.query(
    `UPDATE latch_users
     SET password_hash = $1
     WHERE login_name = $2
     RETURNING id, login_name`,
    [passwordHash, loginName],
  );

  if (!result.rows[0]) {
    console.error(`No latch_users row with login_name=${loginName}`);
    process.exit(1);
  }

  console.log(
    `Updated password_hash for ${result.rows[0].login_name} (${result.rows[0].id})`,
  );
} finally {
  await pool.end();
}
