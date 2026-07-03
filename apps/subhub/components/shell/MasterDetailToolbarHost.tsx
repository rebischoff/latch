"use client";

import type { Manifest } from "@latch/contracts";

import {
  useMasterDetailToolbar,
  type MasterDetailSurfaceConfig,
} from "@/lib/hooks/use-master-detail-toolbar";

type MasterDetailToolbarHostProps = {
  createManifest: Manifest;
  config: MasterDetailSurfaceConfig;
};

export const MasterDetailToolbarHost = ({
  createManifest,
  config,
}: MasterDetailToolbarHostProps) => {
  useMasterDetailToolbar(createManifest, config);
  return null;
};
