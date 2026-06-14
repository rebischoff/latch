import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const ContactsPage = async () => {
  await requireAuth(routes.contacts.list);

  return (
    <SelectFromListPlaceholder
      title="Select a contact"
      description="Choose a contact from the list to view and edit their profile."
    />
  );
};

export default ContactsPage;
