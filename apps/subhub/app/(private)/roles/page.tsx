import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const RolesPage = async () => {
  await requireAuth(routes.roles.list);

  return (
    <SelectFromListPlaceholder
      title="Select a role"
      description="Choose a role from the list to edit catalog details and grants."
    />
  );
};

export default RolesPage;
