import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const CategoriesPage = async () => {
  await requireAuth(routes.categories.list);

  return (
    <SelectFromListPlaceholder
      title="Select a category"
      description="Choose a category from the tree to view and edit its profile."
    />
  );
};

export default CategoriesPage;
