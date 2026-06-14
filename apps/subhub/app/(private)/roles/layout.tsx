import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { RoleListPane } from "@/components/iam/RoleListPane";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

type RolesLayoutProps = {
  children: React.ReactNode;
};

const RolesLayout = async ({ children }: RolesLayoutProps) => {
  await requireAuth(routes.roles.list);

  return (
    <MasterDetailShell list={<RoleListPane />}>{children}</MasterDetailShell>
  );
};

export default RolesLayout;
