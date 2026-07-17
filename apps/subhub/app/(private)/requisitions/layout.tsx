import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { RequisitionList } from "@/components/requisitions/RequisitionList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type RequisitionsLayoutProps = {
  children: React.ReactNode;
};

const RequisitionsLayout = async ({ children }: RequisitionsLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.requisitions.listRoute}
    listSurfaceId="requested_order_list"
    config={MASTER_DETAIL_SURFACES.requisitions}
    list={<RequisitionList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default RequisitionsLayout;
