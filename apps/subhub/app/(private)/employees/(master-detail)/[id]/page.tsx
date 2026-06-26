import { HydrationBoundary } from "@tanstack/react-query";

import { EmployeeDetailForm } from "@/components/employees/EmployeeDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type EmployeeDetailPageProps = {
  params: Promise<{ id: string }>;
};

const EmployeeDetailPage = async ({ params }: EmployeeDetailPageProps) => {
  const { id } = await params;

  await requireAuth(routes.employees.detail(id));
  const { state, manifest } = await prefetchSurfaceDetail("employee_detail", id);

  return (
    <HydrationBoundary state={state}>
      <EmployeeDetailForm employeeId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default EmployeeDetailPage;
