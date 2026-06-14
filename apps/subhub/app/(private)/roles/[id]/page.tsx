import { surfaceAllows } from "@latch/contracts";
import { notFound } from "next/navigation";

import { RoleDetailForm } from "@/components/iam/RoleDetailForm";
import { resolveContext } from "@/lib/latch";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

type RoleDetailPageProps = {
  params: Promise<{ id: string }>;
};

const RoleDetailPage = async ({ params }: RoleDetailPageProps) => {
  const { id } = await params;
  await requireAuth(routes.roles.detail(id));

  const ctx = await resolveContext({
    surfaceId: "role_detail",
    entityId: id,
  });

  if (!surfaceAllows(ctx.manifest, "read")) {
    notFound();
  }

  return <RoleDetailForm roleId={id} manifest={ctx.manifest} />;
};

export default RoleDetailPage;
