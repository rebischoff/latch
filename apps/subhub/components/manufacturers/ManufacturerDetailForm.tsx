"use client";

import type { Manifest } from "@latch/contracts";

import { PartyDetailForm } from "@/components/parties/PartyDetailForm";

type ManufacturerDetailFormProps = {
  manufacturerId: string;
  manifest: Manifest;
  returnTo?: string | null;
  returnField?: string | null;
};

export const ManufacturerDetailForm = ({
  manufacturerId,
  manifest,
  returnTo,
  returnField,
}: ManufacturerDetailFormProps) => (
  <PartyDetailForm
    entityId={manufacturerId}
    surfaceId="manufacturer_detail"
    manifest={manifest}
    returnTo={returnTo}
    returnField={returnField}
  />
);
