import { jsonSuccess, withIamApiHandler } from "@/lib/api/iam-handler";
import { requireSession } from "@/lib/auth/requireSession";
import { getIamDal, resolveContext, resolveContextFresh } from "@/lib/latch";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = async (
  _request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withIamApiHandler(async () => {
    await requireSession();
    const { id } = await params;
    const ctx = await resolveContext({
      surfaceId: "user_roles_detail",
      entityId: id,
    });
    const data = getIamDal().getUserRoles(ctx, id);
    return jsonSuccess(data, ctx.manifest);
  });

export const PATCH = async (
  request: Request,
  { params }: RouteParams,
): Promise<Response> =>
  withIamApiHandler(async () => {
    await requireSession();
    const { id } = await params;
    const ctx = await resolveContextFresh({
      surfaceId: "user_roles_detail",
      entityId: id,
    });
    const body: unknown = await request.json();
    const data = await getIamDal().patchUserRoles(ctx, id, body);
    return jsonSuccess(data, ctx.manifest);
  });
