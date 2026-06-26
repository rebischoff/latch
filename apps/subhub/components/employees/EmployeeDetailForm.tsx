"use client";

import type { Manifest } from "@latch/contracts";

import { PartyDetailForm } from "@/components/parties/PartyDetailForm";

type EmployeeDetailFormProps = {
  employeeId: string;
  manifest: Manifest;
};

export const EmployeeDetailForm = ({
  employeeId,
  manifest,
}: EmployeeDetailFormProps) => (
  <PartyDetailForm
    entityId={employeeId}
    surfaceId="employee_detail"
    manifest={manifest}
  />
);
