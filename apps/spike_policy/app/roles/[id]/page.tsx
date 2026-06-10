import { redirect } from "next/navigation";

type RoleDetailRedirectProps = {
  params: Promise<{ id: string }>;
};

const RoleDetailRedirect = async ({ params }: RoleDetailRedirectProps) => {
  const { id } = await params;
  redirect(`/roles?id=${id}`);
};

export default RoleDetailRedirect;
