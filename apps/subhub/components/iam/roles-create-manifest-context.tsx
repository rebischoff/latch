"use client";

import type { Manifest } from "@latch/contracts";
import { createContext, useContext, type ReactNode } from "react";

const RolesCreateManifestContext = createContext<Manifest | undefined>(undefined);

type RolesCreateManifestProviderProps = {
  manifest: Manifest;
  children: ReactNode;
};

export const RolesCreateManifestProvider = ({
  manifest,
  children,
}: RolesCreateManifestProviderProps) => (
  <RolesCreateManifestContext.Provider value={manifest}>
    {children}
  </RolesCreateManifestContext.Provider>
);

export const useRolesCreateManifest = (): Manifest | undefined =>
  useContext(RolesCreateManifestContext);
