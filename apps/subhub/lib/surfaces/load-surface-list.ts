import type { SurfaceId } from "@latch/contracts";

import { resolveContext } from "../latch";
import {
  type SurfaceListData,
  type SurfaceQueryResult,
} from "../surface-api";

import { assertSurfaceRead } from "./assert-surface-read";
import {
  loadListFromRegistry,
  type SurfaceListId,
} from "./surface-loader-registry";

const isSurfaceListId = (surfaceId: SurfaceId): surfaceId is SurfaceListId =>
  surfaceId === "contact_list" ||
  surfaceId === "user_list" ||
  surfaceId === "role_list" ||
  surfaceId === "customer_list" ||
  surfaceId === "vendor_list" ||
  surfaceId === "manufacturer_list" ||
  surfaceId === "site_list" ||
  surfaceId === "site_contact_relation_table" ||
  surfaceId === "job_party_relation_table" ||
  surfaceId === "estimate_list" ||
  surfaceId === "job_list" ||
  surfaceId === "part_list" ||
  surfaceId === "item_list";

export const loadSurfaceListQuery = async (
  surfaceId: SurfaceListId,
  query?: Record<string, unknown>,
): Promise<SurfaceQueryResult<SurfaceListData>> => {
  const ctx = await resolveContext({ surfaceId });
  assertSurfaceRead(ctx);
  const { rows, total } = await loadListFromRegistry(surfaceId, ctx, query);
  return { data: { rows, total }, manifest: ctx.manifest };
};

export const loadSurfaceListQueryById = async (
  surfaceId: SurfaceId,
  query?: Record<string, unknown>,
): Promise<SurfaceQueryResult<SurfaceListData>> => {
  if (!isSurfaceListId(surfaceId)) {
    throw new Error(`No list loader for surface: ${surfaceId}`);
  }
  return loadSurfaceListQuery(surfaceId, query);
};
