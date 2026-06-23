"use client";

import { Suspense, type ReactNode } from "react";

import { MasterDetailShell } from "@/components/shell/MasterDetailShell";

import { FormPlaygroundPanel } from "./FormPlaygroundPanel";
import { PlaygroundProvider } from "./PlaygroundProvider";

type FormPlaygroundShellProps = {
  children: ReactNode;
};

const FormPlaygroundShellInner = ({ children }: FormPlaygroundShellProps) => (
  <PlaygroundProvider>
    <MasterDetailShell list={<FormPlaygroundPanel />}>{children}</MasterDetailShell>
  </PlaygroundProvider>
);

export const FormPlaygroundShell = ({ children }: FormPlaygroundShellProps) => (
  <Suspense fallback={null}>
    <FormPlaygroundShellInner>{children}</FormPlaygroundShellInner>
  </Suspense>
);
