import { HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { PurchaseOrderDetailForm } from "@/components/purchase-orders/PurchaseOrderDetailForm";
import { PageScroll } from "@/components/shell/PageScroll";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type PageProps = {
  params: Promise<{ id: string }>;
};

const PurchaseOrderDetailPage = async ({ params }: PageProps) => {
  const { id } = await params;
  await requireAuth(routes.purchaseOrders.detail(id));

  if (!id) {
    notFound();
  }

  const { state } = await prefetchSurfaceDetail("purchase_order_detail", id);

  return (
    <PageScroll>
      <HydrationBoundary state={state}>
        <PurchaseOrderDetailForm purchaseOrderId={id} />
      </HydrationBoundary>
    </PageScroll>
  );
};

export default PurchaseOrderDetailPage;
