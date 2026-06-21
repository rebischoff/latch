import { readBetterAuthSession } from "@latch/adapter-better-auth";
import { headers } from "next/headers";
import { cache } from "react";

import { getAuth } from "./latch";

export const getServerSession = cache(() =>
  readBetterAuthSession(getAuth(), () => headers()),
);

export const isAuthenticated = cache(async (): Promise<boolean> => {
  const session = await getServerSession();
  return session !== null;
});
