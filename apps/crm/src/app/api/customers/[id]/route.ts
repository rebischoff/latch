import { jsonSuccess, withCustomerApiHandler } from "@/lib/api/customer-handler";
import { getCustomersDal, resolveContext } from "@/lib/latch";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = async (
  _request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withCustomerApiHandler(async () => {
    const { id } = await params;
    const ctx = await resolveContext({
      surfaceId: "customer_detail",
      entityId: id,
    });
    const data = getCustomersDal().get(ctx, id);
    return jsonSuccess(data, ctx.manifest);
  });

export const PATCH = async (
  request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withCustomerApiHandler(async () => {
    const { id } = await params;
    const ctx = await resolveContext({
      surfaceId: "customer_detail",
      entityId: id,
    });
    const body: unknown = await request.json();
    const data = await getCustomersDal().patch(ctx, id, body);
    return jsonSuccess(data, ctx.manifest);
  });
