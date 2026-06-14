import { redirect } from "next/navigation";

import { needsSetup } from "@/lib/setup";

const PublicHomePage = async () => {
  if (await needsSetup()) {
    redirect("/setup");
  }

  return (
    <div className="public-home">
      <h1>SubHub</h1>
      <p>
        Latch business app for subcontractors. Sign in to manage contacts, jobs,
        and billing.
      </p>
      <p>
        Dev server defaults to port <code>3003</code>.
      </p>
    </div>
  );
};

export default PublicHomePage;
