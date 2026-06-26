import { HydrationBoundary } from "@tanstack/react-query";

import { EmployeeDetailForm } from "@/components/employees/EmployeeDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceCreate } from "@/lib/surfaces/prefetch-surface-query";

const EmployeeCreatePage = async () => {
  await requireAuth(routes.employees.new);
  const { state, manifest } = await prefetchSurfaceCreate("employee_detail", "new");

  return (
    <HydrationBoundary state={state}>
      <EmployeeDetailForm employeeId="new" manifest={manifest} />
    </HydrationBoundary>
  );
};

export default EmployeeCreatePage;
