import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { ItemTreeList } from "@/components/catalog/ItemTreeList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type CategoriesLayoutProps = {
  children: React.ReactNode;
};

const ItemsLayout = async ({ children }: CategoriesLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.items.listRoute}
    listSurfaceId="item_list"
    config={MASTER_DETAIL_SURFACES.items}
    list={<ItemTreeList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default ItemsLayout;
