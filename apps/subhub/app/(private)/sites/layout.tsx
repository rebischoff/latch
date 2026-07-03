import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { SiteList } from "@/components/sites/SiteList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type SitesLayoutProps = {
  children: React.ReactNode;
};

const SitesLayout = async ({ children }: SitesLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.sites.listRoute}
    listSurfaceId="site_list"
    config={MASTER_DETAIL_SURFACES.sites}
    list={<SiteList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default SitesLayout;
