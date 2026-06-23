import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/shell/LoginForm";
import { PageScroll } from "@/components/shell/PageScroll";
import { needsSetup } from "@/lib/setup";

const LoginPage = async () => {
  if (await needsSetup()) {
    redirect("/setup");
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
