import { jsonSuccess, withJobApiHandler } from "@/lib/api/job-handler";
import { getJobsDal, resolveContext } from "@/lib/latch";

const parseListQuery = (url: URL): {
  status?: string;
  limit?: number;
  offset?: number;
} => {
  const status = url.searchParams.get("status");
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");

  return {
    ...(status !== null && status !== "" ? { status } : {}),
    ...(limitRaw !== null && limitRaw !== ""
      ? { limit: Number(limitRaw) }
      : {}),
    ...(offsetRaw !== null && offsetRaw !== ""
      ? { offset: Number(offsetRaw) }
      : {}),
  };
};

export const GET = async (request: Request): Promise<Response> =>
  withJobApiHandler(async () => {
    const ctx = resolveContext({ surfaceId: "job_list" });
    const query = parseListQuery(new URL(request.url));
    const { rows, total } = getJobsDal().list(ctx, query);
    return jsonSuccess({ rows, total }, ctx.manifest);
  });
