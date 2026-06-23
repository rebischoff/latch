import { HydrationBoundary } from "@tanstack/react-query";

import { ContactDetailForm } from "@/components/contacts/ContactDetailForm";
import { routes } from "@/lib/nav-routes";
import { requireAuth } from "@/lib/require-auth";
import { prefetchSurfaceDetail } from "@/lib/surfaces/prefetch-surface-query";

type ContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

const ContactDetailPage = async ({ params }: ContactDetailPageProps) => {
  const { id } = await params;
  await requireAuth(routes.contacts.detail(id));

  const { state, manifest } = await prefetchSurfaceDetail("contact_detail", id);

  return (
    <HydrationBoundary state={state}>
      <ContactDetailForm contactId={id} manifest={manifest} />
    </HydrationBoundary>
  );
};

export default ContactDetailPage;
