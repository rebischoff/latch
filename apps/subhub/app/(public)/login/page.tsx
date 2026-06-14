import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/shell/LoginForm";
import { needsSetup } from "@/lib/setup";

const LoginPage = async () => {
  if (await needsSetup()) {
    redirect("/setup");
  }

  return (
    <>
      <h2>Sign in</h2>
      <p>Use your login name or email to continue.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
};

export default LoginPage;
