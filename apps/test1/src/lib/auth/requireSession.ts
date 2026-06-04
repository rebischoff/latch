import { redirect } from "next/navigation";

import { readProviderSession } from "./provider-session";
import type { SessionPayload } from "./session";

/**
 * Authoritative session gate for protected layouts and Server Actions.
 * Next.js 16: prefer layouts/pages over middleware for auth guarantees.
 */
export const requireSession = async (): Promise<SessionPayload> => {
  const session = await readProviderSession();
  if (!session) {
    redirect("/login");
  }
  return session;
};
