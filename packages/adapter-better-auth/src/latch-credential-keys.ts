import { z } from "zod";

/** Synthetic email suffix for Better Auth credential storage (username logins). */
export const LATCH_AUTH_EMAIL_SUFFIX = "@latch.local";

/** Map a user-facing login identifier to Better Auth's email credential field. */
export const toAuthCredentialEmail = (identifier: string): string => {
  const trimmed = identifier.trim();
  if (z.string().email().safeParse(trimmed).success) {
    return trimmed.toLowerCase();
  }
  return `${trimmed.toLowerCase()}${LATCH_AUTH_EMAIL_SUFFIX}`;
};

/** Lookup keys for bridging Better Auth credentials back to `latch_users`. */
export const authCredentialLookupKeys = (credentialEmail: string): string[] => {
  const normalized = credentialEmail.trim().toLowerCase();
  const keys = new Set<string>([normalized]);

  if (normalized.endsWith(LATCH_AUTH_EMAIL_SUFFIX)) {
    keys.add(normalized.slice(0, -LATCH_AUTH_EMAIL_SUFFIX.length));
  }

  return [...keys];
};
