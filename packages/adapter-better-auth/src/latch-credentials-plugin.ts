import { createAuthMiddleware } from "@better-auth/core/api";
import type { Pool } from "pg";

import {
  authCredentialLookupKeys,
  toAuthCredentialEmail,
} from "./latch-credential-keys";
import { verifyLatchPassword } from "./latch-password";
import type { BetterAuthInstance } from "./better-auth-server";

export type LatchUserCredentialRow = {
  id: string;
  login_name: string | null;
  login_email: string | null;
  password_hash: string | null;
};

type PoolSource = Pool | (() => Pool);

const readPool = (pool: PoolSource): Pool =>
  typeof pool === "function" ? pool() : pool;

const FIND_LATCH_USER_SQL = `
  SELECT id, login_name, login_email, password_hash
  FROM latch_users
  WHERE login_name = $1 OR login_email = $1
  LIMIT 1
`;

const findLatchUserByCredentialEmail = async (
  pool: Pool,
  credentialEmail: string,
): Promise<LatchUserCredentialRow | null> => {
  for (const key of authCredentialLookupKeys(credentialEmail)) {
    const result = await pool.query<LatchUserCredentialRow>(FIND_LATCH_USER_SQL, [
      key,
    ]);
    if (result.rows[0]) {
      return result.rows[0];
    }
  }
  return null;
};

const syncMemoryCredentialUser = async (
  auth: BetterAuthInstance,
  input: {
    credentialEmail: string;
    displayName: string;
    password: string;
    passwordHash: string;
  },
): Promise<void> => {
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(input.credentialEmail, {
    includeAccounts: true,
  });

  if (existing?.user) {
    const credentialAccount = existing.accounts.find(
      (account) => account.providerId === "credential",
    );

    if (credentialAccount?.password) {
      const memoryValid = await verifyLatchPassword(
        credentialAccount.password,
        input.password,
      );
      if (!memoryValid) {
        await ctx.internalAdapter.updatePassword(
          existing.user.id,
          input.passwordHash,
        );
      }
      return;
    }

    await ctx.internalAdapter.linkAccount({
      userId: existing.user.id,
      providerId: "credential",
      accountId: existing.user.id,
      password: input.passwordHash,
    });
    return;
  }

  const createdUser = await ctx.internalAdapter.createUser({
    email: input.credentialEmail,
    name: input.displayName,
    emailVerified: true,
  });

  if (!createdUser) {
    throw new Error("Failed to bootstrap Better Auth credential user");
  }

  await ctx.internalAdapter.linkAccount({
    userId: createdUser.id,
    providerId: "credential",
    accountId: createdUser.id,
    password: input.passwordHash,
  });
};

type SignInEmailBody = {
  email?: string;
  password?: string;
};

const readSignInBody = async (
  ctx: {
    body?: SignInEmailBody;
    request?: Request;
  },
): Promise<SignInEmailBody> => {
  if (ctx.body?.email && ctx.body?.password) {
    return ctx.body;
  }

  if (!ctx.request) {
    return {};
  }

  try {
    return (await ctx.request.clone().json()) as SignInEmailBody;
  } catch {
    return {};
  }
};

/**
 * Better Auth runs on an ephemeral memory adapter. Persist credentials on
 * `latch_users.password_hash` and hydrate the memory store before sign-in.
 */
export const latchCredentialsPlugin = (
  poolSource: PoolSource,
  getAuth: () => BetterAuthInstance,
) => ({
  id: "latch-credentials",
  version: "1.0.0",
  hooks: {
    before: [
      {
        matcher: (context: { path?: string }) =>
          context.path === "/sign-in/email",
        handler: createAuthMiddleware(async (ctx) => {
          const body = await readSignInBody(ctx);
          const email = body.email?.trim().toLowerCase();
          const password = body.password;

          if (!email || !password) {
            return;
          }

          const latchUser = await findLatchUserByCredentialEmail(
            readPool(poolSource),
            email,
          );

          if (!latchUser?.password_hash) {
            return;
          }

          if (!(await verifyLatchPassword(latchUser.password_hash, password))) {
            return;
          }

          await syncMemoryCredentialUser(getAuth(), {
            credentialEmail: email,
            displayName:
              latchUser.login_name ?? latchUser.login_email ?? latchUser.id,
            password,
            passwordHash: latchUser.password_hash,
          });
        }),
      },
    ],
  },
});

export { findLatchUserByCredentialEmail, toAuthCredentialEmail };
