import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const ManufacturersPage = async () => {
  await requireAuth(routes.manufacturers.list);

  return (
    <SelectFromListPlaceholder
      title="Select a manufacturer"
      description="Choose a manufacturer from the list to view and edit its profile."
    />
  );
};

export default ManufacturersPage;
