import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const UsersPage = async () => {
  await requireAuth(routes.users.list);

  return (
    <SelectFromListPlaceholder
      title="Select a user"
      description="Choose a user from the list to view profile and role assignments."
    />
  );
};

export default UsersPage;
