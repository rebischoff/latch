import { MasterDetailShell } from "@/components/shell/MasterDetailShell";
import { UserListPane } from "@/components/iam/UserListPane";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

type UsersLayoutProps = {
  children: React.ReactNode;
};

const UsersLayout = async ({ children }: UsersLayoutProps) => {
  await requireAuth(routes.users.list);

  return (
    <MasterDetailShell list={<UserListPane />}>{children}</MasterDetailShell>
  );
};

export default UsersLayout;
