import { AppShell } from "@/components/AppShell";
import { getPrincipal } from "@/lib/auth/getPrincipal";
import { requireSession } from "@/lib/auth/requireSession";
import { resolveNavItems } from "@/lib/nav";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();
  const principal = await getPrincipal();
  const navItems = resolveNavItems(principal);

  return (
    <AppShell userLabel={session.label} navItems={navItems}>
      {children}
    </AppShell>
  );
}
