import { isNotFoundError } from "@latch/contracts";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CustomersSplitView } from "@/components/customers/CustomersSplitView";
import { getCustomersDal, resolveContext } from "@/lib/latch";

export const dynamic = "force-dynamic";

type CustomersPageProps = {
  searchParams: Promise<{ id?: string }>;
};

const CustomersPageContent = async ({ customerId }: { customerId?: string }) => {
  if (!customerId) {
    return <CustomersSplitView />;
  }

  try {
    const ctx = await resolveContext({
      surfaceId: "customer_detail",
      entityId: customerId,
    });
    const customer = getCustomersDal().get(ctx, customerId);
    return (
      <CustomersSplitView
        customerId={customerId}
        detail={{ customer, manifest: ctx.manifest }}
      />
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      notFound();
    }
    throw error;
  }
};

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const { id } = await searchParams;

  return (
    <Suspense fallback={<CustomersSplitView customerId={id} detailLoading />}>
      <CustomersPageContent customerId={id} />
    </Suspense>
  );
}
