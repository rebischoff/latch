"use client";

import type { Manifest } from "@latch/contracts";

import { PartyDetailForm } from "@/components/parties/PartyDetailForm";

type EmployeeDetailFormProps = {
  employeeId: string;
  manifest: Manifest;
  returnTo?: string | null;
  returnField?: string | null;
};

export const EmployeeDetailForm = ({
  employeeId,
  manifest,
  returnTo,
  returnField,
}: EmployeeDetailFormProps) => (
  <PartyDetailForm
    entityId={employeeId}
    surfaceId="employee_detail"
    manifest={manifest}
    returnTo={returnTo}
    returnField={returnField}
  />
);
