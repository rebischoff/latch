import type { BetterAuthInstance } from "./better-auth-server";
import {
  findLatchUserByCredentialEmail,
  toAuthCredentialEmail,
} from "./latch-credentials-plugin";
import { verifyLatchPassword } from "./latch-password";
import type { Pool } from "pg";

export type LatchSignInInput = {
  identifier: string;
  password: string;
  rememberMe?: boolean;
  request: Request;
};

const INVALID_CREDENTIALS = {
  message: "Invalid email or password",
  code: "INVALID_EMAIL_OR_PASSWORD",
} as const;

const ensureMemoryCredentialUser = async (
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

/**
 * Verify `latch_users.password_hash`, sync the ephemeral memory adapter, then
 * issue a Better Auth session (Set-Cookie on the returned Response).
 */
export const signInWithLatchCredentials = async (
  auth: BetterAuthInstance,
  pool: Pool,
  input: LatchSignInInput,
): Promise<Response> => {
  const credentialEmail = toAuthCredentialEmail(input.identifier);
  const latchUser = await findLatchUserByCredentialEmail(pool, credentialEmail);

  if (!latchUser?.password_hash) {
    return Response.json(INVALID_CREDENTIALS, { status: 401 });
  }

  if (!(await verifyLatchPassword(latchUser.password_hash, input.password))) {
    return Response.json(INVALID_CREDENTIALS, { status: 401 });
  }

  await ensureMemoryCredentialUser(auth, {
    credentialEmail,
    displayName: latchUser.login_name ?? latchUser.login_email ?? latchUser.id,
    password: input.password,
    passwordHash: latchUser.password_hash,
  });

  return auth.api.signInEmail({
    body: {
      email: credentialEmail,
      password: input.password,
      rememberMe: input.rememberMe,
    },
    headers: input.request.headers,
    asResponse: true,
  });
};
