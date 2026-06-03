import { redirect } from "next/navigation";

import { readProviderSession } from "@/lib/auth/provider-session";

export default async function HomePage() {
  const session = await readProviderSession();
  redirect(session ? "/jobs" : "/login");
}
