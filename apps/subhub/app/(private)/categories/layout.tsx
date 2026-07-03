import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { CategoryTreeList } from "@/components/catalog/CategoryTreeList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type CategoriesLayoutProps = {
  children: React.ReactNode;
};

const CategoriesLayout = async ({ children }: CategoriesLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.categories.listRoute}
    listSurfaceId="category_list"
    config={MASTER_DETAIL_SURFACES.categories}
    list={<CategoryTreeList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default CategoriesLayout;
