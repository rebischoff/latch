import { redirect } from "next/navigation";

import { readSessionCookie } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await readSessionCookie();
  redirect(session ? "/jobs" : "/login");
}
