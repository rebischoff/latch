import { HydrationBoundary } from "@tanstack/react-query";

import { EmployeeList } from "@/components/employees/EmployeeList";
import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { resolveContext } from "@/lib/latch";
import { prefetchSurfaceList } from "@/lib/surfaces/prefetch-surface-query";

type EmployeesLayoutProps = {
  children: React.ReactNode;
};

const EmployeesLayout = async ({ children }: EmployeesLayoutProps) => {
  await requireAuth(routes.employees.list);
  const [dehydratedState, { manifest: detailWriteManifest }] = await Promise.all([
    prefetchSurfaceList("employee_list"),
    resolveContext({ surfaceId: "employee_detail", entityId: "new" }),
  ]);

  return (
    <HydrationBoundary state={dehydratedState}>
      <MasterDetailShell list={<EmployeeList detailWriteManifest={detailWriteManifest} />}>
        {children}
      </MasterDetailShell>
    </HydrationBoundary>
  );
};

export default EmployeesLayout;
