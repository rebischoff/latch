import { notFound } from "next/navigation";

import { FormPlaygroundShell } from "@/components/dev/FormPlaygroundShell";
import { requireAuth } from "@/lib/require-auth";

type FormPlaygroundLayoutProps = {
  children: React.ReactNode;
};

const isPlaygroundEnabled = (): boolean =>
  process.env.NODE_ENV === "development" ||
  process.env.LATCH_DEV_PLAYGROUND === "1";

const FormPlaygroundLayout = async ({ children }: FormPlaygroundLayoutProps) => {
  if (!isPlaygroundEnabled()) {
    notFound();
  }

  await requireAuth("/dev/form-playground");

  return <FormPlaygroundShell>{children}</FormPlaygroundShell>;
};

export default FormPlaygroundLayout;
