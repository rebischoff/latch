import { readBetterAuthSession } from "@latch/adapter-better-auth";
import { headers } from "next/headers";

import { getAuth } from "./latch";

export const getServerSession = () =>
  readBetterAuthSession(getAuth(), () => headers());

export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getServerSession();
  return session !== null;
};
