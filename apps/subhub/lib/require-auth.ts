import { redirect } from "next/navigation";

import { isAuthenticated } from "./auth-session";
import {
  changePasswordRequiredHref,
  loginHref,
  setupHref,
} from "./auth-utils";
import { readMustChangePassword } from "./must-change-password";
import { routes } from "./nav-routes";
import { needsSetup } from "./setup";

export const requireAuth = async (callbackPath: string): Promise<void> => {
  if (await needsSetup()) {
    redirect(setupHref(callbackPath));
  }

  if (!(await isAuthenticated())) {
    redirect(loginHref(callbackPath));
  }

  const mustChangePassword = await readMustChangePassword();
  if (
    mustChangePassword &&
    callbackPath !== routes.changePasswordRequired
  ) {
    redirect(changePasswordRequiredHref(callbackPath));
  }
};
