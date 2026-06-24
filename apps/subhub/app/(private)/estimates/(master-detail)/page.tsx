import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const EstimatesPage = async () => {
  await requireAuth(routes.estimates.list);

  return (
    <SelectFromListPlaceholder
      title="Select an estimate"
      description="Choose an estimate from the list to view and edit its quote."
    />
  );
};

export default EstimatesPage;
