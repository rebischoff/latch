import { ContactList } from "@/components/contacts/ContactList";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

type ContactsLayoutProps = {
  children: React.ReactNode;
};

const ContactsLayout = async ({ children }: ContactsLayoutProps) => {
  await requireAuth(routes.contacts.list);

  return (
    <MasterDetailShell list={<ContactList />}>{children}</MasterDetailShell>
  );
};

export default ContactsLayout;
