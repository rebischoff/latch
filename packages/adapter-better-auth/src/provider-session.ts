import type { BetterAuthInstance } from "./better-auth-server";

export type ProviderSession = {
  /** Better Auth subject id (not authoritative for Latch permissions). */
  userId: string;
  label: string;
  email?: string;
};

type HeaderSource = Headers | (() => Headers | Promise<Headers>);

const resolveHeaders = async (
  source: HeaderSource,
): Promise<Headers> => (typeof source === "function" ? source() : source);

/** Better Auth session mapped to Latch shape (user id + label only; no roles). */
export const readBetterAuthSession = async (
  auth: BetterAuthInstance,
  headers: HeaderSource,
): Promise<ProviderSession | null> => {
  const result = await auth.api.getSession({
    headers: await resolveHeaders(headers),
  });
  const userId = result?.user?.id;
  if (!userId) {
    return null;
  }

  return {
    userId,
    label: result.user.name ?? userId,
    email: result.user.email ?? undefined,
  };
};
