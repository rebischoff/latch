import {
  toAuthCredentialEmail,
  verifyLatchPassword,
  type BetterAuthInstance,
} from "@latch/adapter-better-auth";

/** Keep Better Auth in-memory credential store aligned with `latch_users.password_hash`. */
export const syncMemoryCredentialPassword = async (
  auth: BetterAuthInstance,
  input: {
    loginName: string | null;
    loginEmail: string | null;
    password: string;
    passwordHash: string;
  },
): Promise<void> => {
  const identifier = input.loginEmail ?? input.loginName;
  if (!identifier) {
    return;
  }

  const credentialEmail = toAuthCredentialEmail(identifier);
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(credentialEmail, {
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
    email: credentialEmail,
    name: input.loginName ?? input.loginEmail ?? identifier,
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
