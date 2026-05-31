import { jsonSuccess, withJobApiHandler } from "@/lib/api/job-handler";
import { getJobsDal, resolveContext } from "@/lib/latch";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = async (
  _request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withJobApiHandler(async () => {
    const { id } = await params;
    const ctx = resolveContext({ surfaceId: "job_detail", entityId: id });
    const data = getJobsDal().get(ctx, id);
    return jsonSuccess(data, ctx.manifest);
  });

export const PATCH = async (
  request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withJobApiHandler(async () => {
    const { id } = await params;
    const ctx = resolveContext({ surfaceId: "job_detail", entityId: id });
    const body: unknown = await request.json();
    const data = await getJobsDal().patch(ctx, id, body);
    return jsonSuccess(data, ctx.manifest);
  });

export const DELETE = async (
  _request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withJobApiHandler(async () => {
    const { id } = await params;
    const ctx = resolveContext({ surfaceId: "job_detail", entityId: id });
    await getJobsDal().delete(ctx, id);
    return new Response(null, { status: 204 });
  });
