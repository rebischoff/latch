import { surfaceAllows } from "@latch/contracts";
import { notFound } from "next/navigation";

import { ContactDetailForm } from "@/components/contacts/ContactDetailForm";
import { resolveContext } from "@/lib/latch";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";

type ContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

const ContactDetailPage = async ({ params }: ContactDetailPageProps) => {
  const { id } = await params;
  await requireAuth(routes.contacts.detail(id));

  const ctx = await resolveContext({
    surfaceId: "contact_detail",
    entityId: id,
  });

  if (!surfaceAllows(ctx.manifest, "read")) {
    notFound();
  }

  return <ContactDetailForm contactId={id} manifest={ctx.manifest} />;
};

export default ContactDetailPage;
