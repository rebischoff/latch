import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { PurchaseOrderList } from "@/components/purchase-orders/PurchaseOrderList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type PurchaseOrdersLayoutProps = {
  children: React.ReactNode;
};

const PurchaseOrdersLayout = async ({ children }: PurchaseOrdersLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.purchaseOrders.listRoute}
    listSurfaceId="purchase_order_list"
    config={MASTER_DETAIL_SURFACES.purchaseOrders}
    list={<PurchaseOrderList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default PurchaseOrdersLayout;
