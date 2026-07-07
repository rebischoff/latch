import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const ItemsPage = async () => {
  await requireAuth(routes.items.list);

  return (
    <SelectFromListPlaceholder
      title="Select an item"
      description="Choose an item from the tree to view and edit its profile."
    />
  );
};

export default ItemsPage;
