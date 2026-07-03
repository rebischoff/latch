import { HydrationBoundary } from "@tanstack/react-query";

import { EmployeeDetailForm } from "@/components/employees/EmployeeDetailForm";
import { toSearchParams } from "@/lib/next-search-params";
import { parseReturnContext } from "@/lib/picker-return-context";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceCreate, prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type EmployeeIdPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EmployeeIdPage = async ({ params, searchParams }: EmployeeIdPageProps) => {
  const { id } = await params;

  if (id === "new") {
    const resolvedSearchParams = await searchParams;
    const { returnTo, returnField } = parseReturnContext(
      toSearchParams(resolvedSearchParams),
    );

    await requireAuth(routes.employees.new);
    const { state, manifest } = await prefetchSurfaceCreate("employee_detail", "new");

    return (
      <HydrationBoundary state={state}>
        <EmployeeDetailForm
          employeeId="new"
          manifest={manifest}
          returnTo={returnTo}
          returnField={returnField}
        />
      </HydrationBoundary>
    );
  }

  await requireAuth(routes.employees.detail(id));
  const { state, manifest } = await prefetchSurfaceDetail("employee_detail", id);

  return (
    <HydrationBoundary state={state}>
      <EmployeeDetailForm employeeId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default EmployeeIdPage;
