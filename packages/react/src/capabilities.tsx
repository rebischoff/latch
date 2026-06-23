"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import {
  fieldAllows,
  type FieldAction,
  type FieldId,
  type Manifest,
} from "@latch/contracts";

const CapabilitiesContext = createContext<Manifest | null>(null);

export type CapabilitiesProviderProps = {
  manifest: Manifest;
  children: ReactNode;
};

export const CapabilitiesProvider = ({
  manifest,
  children,
}: CapabilitiesProviderProps) => (
  <CapabilitiesContext.Provider value={manifest}>
    {children}
  </CapabilitiesContext.Provider>
);

export const useManifest = (): Manifest => {
  const manifest = useContext(CapabilitiesContext);
  if (manifest === null) {
    throw new Error("useManifest must be used within CapabilitiesProvider");
  }
  return manifest;
};

export type CanProps = {
  field: FieldId;
  action: FieldAction;
  children: ReactNode;
};

/** Renders children only when the manifest grants the Field action. */
export const Can = ({ field, action, children }: CanProps) => {
  const manifest = useManifest();
  if (!fieldAllows(manifest, field, action)) {
    return null;
  }
  return <>{children}</>;
};
