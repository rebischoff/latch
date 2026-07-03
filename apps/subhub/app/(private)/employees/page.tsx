import { SelectFromListPlaceholder } from "@/components/shell/SelectFromListPlaceholder";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

const EmployeesPage = async () => {
  await requireAuth(routes.employees.list);

  return (
    <SelectFromListPlaceholder
      title="Select an employee"
      description="Choose an employee from the list to view and edit their profile."
    />
  );
};

export default EmployeesPage;
