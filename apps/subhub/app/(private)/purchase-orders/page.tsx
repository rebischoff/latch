import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const PurchaseOrdersPage = async () => {
  await requireAuth(routes.purchaseOrders.list);

  return (
    <SelectFromListPlaceholder
      title="Select a purchase order"
      description="Choose a PO from the list, create a general (job-less) PO, or open Requisitions to create from job demand."
    />
  );
};

export default PurchaseOrdersPage;
