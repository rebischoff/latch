import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { ManufacturerList } from "@/components/manufacturers/ManufacturerList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type ManufacturersLayoutProps = {
  children: React.ReactNode;
};

const ManufacturersLayout = async ({ children }: ManufacturersLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.manufacturers.listRoute}
    listSurfaceId="manufacturer_list"
    config={MASTER_DETAIL_SURFACES.manufacturers}
    list={<ManufacturerList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default ManufacturersLayout;
