import { redirect } from "next/navigation";

import { readProviderSession } from "@/lib/auth/provider-session";

export default async function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readProviderSession();
  if (session) {
    redirect("/jobs");
  }
  return children;
}
