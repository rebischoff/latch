import { redirect } from "next/navigation";

import { readSessionCookie } from "@/lib/auth/session";

export default async function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readSessionCookie();
  if (session) {
    redirect("/jobs");
  }
  return children;
}
