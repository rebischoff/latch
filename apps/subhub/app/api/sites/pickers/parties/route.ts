import {
  jsonSuccess,
  parseOffsetLimitQuery,
  withApiHandler,
} from "@latch/app-kit";
import {
  ForbiddenError,
  surfaceAllows,
  ValidationError,
} from "@latch/contracts";
import { z } from "zod";

import {
  createPersonParty,
  loadPartyList,
  type PartyRoleFilter,
} from "../../../../../lib/contacts/repository";
import { getPool, getPrincipal, resolveContext } from "../../../../../lib/latch";
import { assertSurfaceRead } from "../../../../../lib/surfaces/assert-surface-read";

const QuickCreatePersonSchema = z
  .object({
    display_name: z.string().min(1),
    phone: z.string().optional(),
  })
  .strict();

const parsePartyRole = (request: Request): PartyRoleFilter | undefined => {
  const role = new URL(request.url).searchParams.get("role");
  if (role === "customer" || role === "property_owner") {
    return role;
  }
  if (role === "any") {
    return undefined;
  }

  throw new ValidationError("role must be customer, property_owner, or any", {
    field: "role",
  });
};

export const GET = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "site_list" });
    assertSurfaceRead(ctx);

    const role = parsePartyRole(request);
    const parsed = parseOffsetLimitQuery(request);
    const result = await loadPartyList(
      getPool(),
      {
        principalId: ctx.principal.id,
        limit: typeof parsed?.limit === "number" ? parsed.limit : 100,
        offset: typeof parsed?.offset === "number" ? parsed.offset : 0,
        rowScope: ctx.manifest.rowScope ?? "all",
      },
      role,
    );

    const rows =
      role === "customer"
        ? result.rows.filter((row) => row.kind === "organization")
        : result.rows;

    return jsonSuccess(
      {
        rows: rows.map((row) => ({
          id: row.id,
          display_name: row.display_name,
          kind: row.kind,
        })),
        total: rows.length,
      },
      ctx.manifest,
    );
  });

export const POST = async (request: Request): Promise<Response> =>
  withApiHandler(async () => {
    const ctx = await resolveContext({ surfaceId: "site_detail" });
    if (!surfaceAllows(ctx.manifest, "write")) {
      throw new ForbiddenError();
    }

    const parsed = QuickCreatePersonSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten());
    }

    const principal = await getPrincipal();
    const row = await createPersonParty(getPool(), principal.id, parsed.data);

    return jsonSuccess({ row }, ctx.manifest);
  });
