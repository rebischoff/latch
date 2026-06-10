import { redirect } from "next/navigation";

type UserDetailRedirectProps = {
  params: Promise<{ id: string }>;
};

const UserDetailRedirect = async ({ params }: UserDetailRedirectProps) => {
  const { id } = await params;
  redirect(`/users?id=${id}`);
};

export default UserDetailRedirect;
