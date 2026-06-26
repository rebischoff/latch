import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ChangePasswordRequiredForm } from "@/components/shell/ChangePasswordRequiredForm";
import { PageScroll } from "@/components/shell/PageScroll";
import { isAuthenticated } from "@/lib/auth-session";
import { loginHref, sanitizeCallbackUrl } from "@/lib/auth-utils";
import { readMustChangePassword } from "@/lib/must-change-password";
import { routes } from "@/lib/nav-routes";
import { needsSetup } from "@/lib/setup";

type ChangePasswordRequiredPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

const ChangePasswordRequiredPage = async ({
  searchParams,
}: ChangePasswordRequiredPageProps) => {
  if (await needsSetup()) {
    redirect("/setup");
  }

  if (!(await isAuthenticated())) {
    redirect(loginHref(routes.changePasswordRequired));
  }

  if (!(await readMustChangePassword())) {
    const { callbackUrl } = await searchParams;
    redirect(sanitizeCallbackUrl(callbackUrl));
  }

  return (
    <PageScroll>
      <h2>Choose a new password</h2>
      <p>
        Your account was created with a temporary password. Set a new password
        before continuing.
      </p>
      <Suspense fallback={null}>
        <ChangePasswordRequiredForm />
      </Suspense>
    </PageScroll>
  );
};

export default ChangePasswordRequiredPage;
