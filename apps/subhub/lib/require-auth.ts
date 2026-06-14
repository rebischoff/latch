import { redirect } from "next/navigation";

import { isAuthenticated } from "./auth-session";
import { loginHref, setupHref } from "./auth-utils";
import { needsSetup } from "./setup";

export const requireAuth = async (callbackPath: string): Promise<void> => {
  if (await needsSetup()) {
    redirect(setupHref(callbackPath));
  }

  if (!(await isAuthenticated())) {
    redirect(loginHref(callbackPath));
  }
};
