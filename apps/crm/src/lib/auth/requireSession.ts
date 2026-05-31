import { redirect } from "next/navigation";

import { readSessionCookie, type SessionPayload } from "./session.js";

/**
 * Authoritative session gate for protected layouts and Server Actions.
 * Next.js 16: prefer layouts/pages over middleware for auth guarantees.
 */
export const requireSession = async (): Promise<SessionPayload> => {
  const session = await readSessionCookie();
  if (!session) {
    redirect("/login");
  }
  return session;
};
