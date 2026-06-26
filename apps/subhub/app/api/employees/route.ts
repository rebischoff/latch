import {
  createSurfaceListRouteHandlers,
  jsonSuccess,
  parseOffsetLimitQuery,
} from "@latch/app-kit";

import { withSubhubApiHandler } from "../../../lib/api-handler";
import { ensureContactsDal } from "../../../lib/contacts/dal";
import { resolveContext, resolveContextFresh } from "../../../lib/latch";
import { assertSurfaceRead } from "../../../lib/surfaces/assert-surface-read";
import { createListFromRegistry } from "../../../lib/surfaces/surface-loader-registry";

const parseEmployeeListQuery = (request: Request): Record<string, unknown> | undefined => {
  const base = parseOffsetLimitQuery(request) ?? {};
  const q = new URL(request.url).searchParams.get("q");
  if (q !== null) {
    base.q = q;
  }
  return Object.keys(base).length > 0 ? base : undefined;
};

const handlers = createSurfaceListRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toListInput: () => ({ surfaceId: "employee_list" }),
  parseListQuery: parseEmployeeListQuery,
  dal: {
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.employeeList.list!(ctx, query);
    },
  },
});

export const GET = async (request: Request): Promise<Response> => {
  await ensureContactsDal();
  return handlers.GET(request);
};

export const POST = async (request: Request): Promise<Response> =>
  withSubhubApiHandler(async () => {
    const ctx = await resolveContextFresh({
      surfaceId: "employee_detail",
      entityId: "new",
    });
    assertSurfaceRead(ctx);
    const body: unknown = await request.json();
    const data = await createListFromRegistry("employee_list", ctx, body);
    return jsonSuccess(data, ctx.manifest);
  });
