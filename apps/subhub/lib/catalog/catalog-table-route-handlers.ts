import { jsonSuccess } from "@latch/app-kit";
import type { SurfaceId } from "@latch/contracts";

import { withSubhubApiHandler } from "../../lib/api-handler";
import { ensureCatalogDal } from "../../lib/catalog/dal";
import { resolveContext, resolveContextFresh } from "../../lib/latch";
import { assertSurfaceRead } from "../../lib/surfaces/assert-surface-read";

type CatalogTableDalKey =
  | "laborRateTypeTable"
  | "laborPhaseTable"
  | "complexityFactorTable"
  | "markupTypeTable"
  | "freightRateTypeTable"
  | "incidentalRateTypeTable"
  | "specUnitTable";

export const createCatalogTableRouteHandlers = (
  surfaceId: SurfaceId,
  dalKey: CatalogTableDalKey,
) => ({
  GET: async (): Promise<Response> =>
    withSubhubApiHandler(async () => {
      const ctx = await resolveContext({ surfaceId });
      assertSurfaceRead(ctx);
      const dal = await ensureCatalogDal();
      const tableDal = dal[dalKey];
      const { rows, total } = await tableDal.listAll(ctx);
      return jsonSuccess({ rows, total }, ctx.manifest);
    }),

  POST: async (request: Request): Promise<Response> =>
    withSubhubApiHandler(async () => {
      const ctx = await resolveContextFresh({ surfaceId });
      assertSurfaceRead(ctx);
      const body: unknown = await request.json();
      const dal = await ensureCatalogDal();
      const data = await dal[dalKey].create(ctx, body);
      return jsonSuccess(data, ctx.manifest);
    }),

  PATCH: async (request: Request): Promise<Response> =>
    withSubhubApiHandler(async () => {
      const ctx = await resolveContextFresh({ surfaceId });
      assertSurfaceRead(ctx);
      const body: unknown = await request.json();
      const dal = await ensureCatalogDal();
      const data = await dal[dalKey].replace(ctx, body);
      return jsonSuccess(data, ctx.manifest);
    }),
});
