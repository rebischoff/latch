import { headers } from "next/headers";

import { auth } from "./auth";
import type { SessionPayload } from "./session";

/** Better Auth session mapped to Latch session shape (user id + label only; no roles). */
export const readProviderSession = async (): Promise<SessionPayload | null> => {
  const result = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = result?.user?.id;
  if (!userId) {
    return null;
  }
  const email = result.user.email;
  if (!email) {
    return null;
  }

  return {
    userId,
    label: result.user.name ?? userId,
    email,
  };
};
