import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const SitesPage = async () => {
  await requireAuth(routes.sites.list);

  return (
    <SelectFromListPlaceholder
      title="Select a site"
      description="Choose a site from the list to view and edit its profile."
    />
  );
};

export default SitesPage;
