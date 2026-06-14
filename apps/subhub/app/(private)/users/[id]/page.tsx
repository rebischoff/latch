import { surfaceAllows } from "@latch/contracts";
import { notFound } from "next/navigation";

import { UserDetailForm } from "@/components/iam/UserDetailForm";
import { resolveContext } from "@/lib/latch";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

const UserDetailPage = async ({ params }: UserDetailPageProps) => {
  const { id } = await params;
  await requireAuth(routes.users.detail(id));

  const ctx = await resolveContext({
    surfaceId: "user_roles_detail",
    entityId: id,
  });

  if (!surfaceAllows(ctx.manifest, "read")) {
    notFound();
  }

  return <UserDetailForm userId={id} manifest={ctx.manifest} />;
};

export default UserDetailPage;
