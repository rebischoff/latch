import type { SurfaceId } from "@latch/contracts";

import { resolveContext } from "../latch";
import {
  type SurfaceDetailData,
  type SurfaceQueryResult,
} from "../surface-api";

import { assertSurfaceRead } from "./assert-surface-read";
import {
  loadDetailFromRegistry,
  type SurfaceDetailId,
} from "./surface-loader-registry";

const isSurfaceDetailId = (surfaceId: SurfaceId): surfaceId is SurfaceDetailId =>
  surfaceId === "contact_detail" ||
  surfaceId === "manufacturer_detail" ||
  surfaceId === "employee_detail" ||
  surfaceId === "site_detail" ||
  surfaceId === "user_roles_detail" ||
  surfaceId === "role_detail" ||
  surfaceId === "estimate_detail" ||
  surfaceId === "job_detail" ||
  surfaceId === "requested_order_detail" ||
  surfaceId === "part_detail" ||
  surfaceId === "item_detail";

export const loadSurfaceDetailQuery = async (
  surfaceId: SurfaceDetailId,
  entityId: string,
): Promise<SurfaceQueryResult<SurfaceDetailData>> => {
  const ctx = await resolveContext({ surfaceId, entityId });
  assertSurfaceRead(ctx);
  const data = await loadDetailFromRegistry(surfaceId, ctx, entityId);
  return { data, manifest: ctx.manifest };
};

export const loadSurfaceDetailQueryById = async (
  surfaceId: SurfaceId,
  entityId: string,
): Promise<SurfaceQueryResult<SurfaceDetailData>> => {
  if (!isSurfaceDetailId(surfaceId)) {
    throw new Error(`No detail loader for surface: ${surfaceId}`);
  }
  return loadSurfaceDetailQuery(surfaceId, entityId);
};
