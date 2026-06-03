import { auth } from "./auth.js";
import type { SessionPayload } from "./session.js";

/** Auth.js session mapped to CRM session shape (user id + label only; no roles). */
export const readProviderSession = async (): Promise<SessionPayload | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  return {
    userId,
    label: session.user.name ?? userId,
  };
};
