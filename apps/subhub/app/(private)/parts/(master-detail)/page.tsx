import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const PartsPage = async () => {
  await requireAuth(routes.parts.list);

  return (
    <SelectFromListPlaceholder
      title="Select a part"
      description="Choose a part from the list to view and edit its profile."
    />
  );
};

export default PartsPage;
