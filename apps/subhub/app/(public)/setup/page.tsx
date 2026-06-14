import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SetupForm } from "@/components/shell/SetupForm";
import { needsSetup } from "@/lib/setup";

const SetupPage = async () => {
  if (!(await needsSetup())) {
    redirect("/login");
  }

  return (
    <>
      <h2>First-run setup</h2>
      <p>
        Create the master account for this SubHub install. You need the install
        token from <code>LATCH_SETUP_KEY</code>.
      </p>
      <Suspense fallback={null}>
        <SetupForm />
      </Suspense>
    </>
  );
};

export default SetupPage;
