import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const RequisitionsPage = async () => {
  await requireAuth(routes.requisitions.list);

  return (
    <SelectFromListPlaceholder
      title="Select a requisition"
      description="Choose a requisition from the list to view its lines, or start a new one for a job."
    />
  );
};

export default RequisitionsPage;
