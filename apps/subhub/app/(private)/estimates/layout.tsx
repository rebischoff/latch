import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { EstimateList } from "@/components/estimates/EstimateList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type EstimatesLayoutProps = {
  children: React.ReactNode;
};

const EstimatesLayout = async ({ children }: EstimatesLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.estimates.listRoute}
    listSurfaceId="estimate_list"
    config={MASTER_DETAIL_SURFACES.estimates}
    list={<EstimateList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default EstimatesLayout;
