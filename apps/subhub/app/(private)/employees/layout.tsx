import { MasterDetailChromeLayout } from "@/components/shell/MasterDetailChromeLayout";
import { EmployeeList } from "@/components/employees/EmployeeList";
import { MASTER_DETAIL_SURFACES } from "@/lib/master-detail-registry";

type EmployeesLayoutProps = {
  children: React.ReactNode;
};

const EmployeesLayout = async ({ children }: EmployeesLayoutProps) => (
  <MasterDetailChromeLayout
    listRoute={MASTER_DETAIL_SURFACES.employees.listRoute}
    listSurfaceId="employee_list"
    config={MASTER_DETAIL_SURFACES.employees}
    list={<EmployeeList />}
  >
    {children}
  </MasterDetailChromeLayout>
);

export default EmployeesLayout;
