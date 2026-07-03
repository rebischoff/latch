import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { PartList } from "@/components/parts/PartList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type PartsLayoutProps = {
  children: React.ReactNode;
};

const PartsLayout = async ({ children }: PartsLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.parts.listRoute}
    listSurfaceId="part_list"
    config={MASTER_DETAIL_SURFACES.parts}
    list={<PartList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default PartsLayout;
