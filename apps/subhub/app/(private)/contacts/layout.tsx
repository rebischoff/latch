import { HydrationBoundary } from "@tanstack/react-query";

import { ContactList } from "@/components/contacts/ContactList";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type ContactsLayoutProps = {
  children: React.ReactNode;
};

const ContactsLayout = async ({ children }: ContactsLayoutProps) => {
  await requireAuth(routes.contacts.list);
  const dehydratedState = await prefetchSurfaceList("contact_list");

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<ContactList />}>{children}</MasterDetailShell>
    </HydrationBoundary>
  );
};

export default ContactsLayout;
