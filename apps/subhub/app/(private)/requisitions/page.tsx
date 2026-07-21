import { PageScroll } from "@/components/shell/PageScroll";
import { RequisitionList } from "@/components/requisitions/RequisitionList";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const RequisitionsPage = async () => {
  await requireAuth(routes.requisitions.list);

  return (
    <PageScroll>
      <RequisitionList />
    </PageScroll>
  );
};

export default RequisitionsPage;
