import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/shell/LoginForm";
import { PageScroll } from "@/components/shell/PageScroll";
import { isAuthenticated } from "@/lib/auth-session";
import {
  changePasswordRequiredHref,
  sanitizeCallbackUrl,
} from "@/lib/auth-utils";
import { readMustChangePassword } from "@/lib/must-change-password";
import { needsSetup } from "@/lib/setup";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  if (await needsSetup()) {
    redirect("/setup");
  }

  if (await isAuthenticated()) {
    const { callbackUrl } = await searchParams;
    const safeCallback = sanitizeCallbackUrl(callbackUrl);

    if (await readMustChangePassword()) {
      redirect(changePasswordRequiredHref(safeCallback));
    }

    redirect(safeCallback);
  }

  return (
    <PageScroll>
      <h2>Sign in</h2>
      <p>Use your login name or email to continue.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PageScroll>
  );
};

export default LoginPage;
