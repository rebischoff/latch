import { PurchaseOrderGeneralCreateForm } from "@/components/purchase-orders/PurchaseOrderGeneralCreateForm";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const PurchaseOrderNewPage = async () => {
  await requireAuth(routes.purchaseOrders.new);

  return (
    <PageScroll>
      <PurchaseOrderGeneralCreateForm />
    </PageScroll>
  );
};

export default PurchaseOrderNewPage;
