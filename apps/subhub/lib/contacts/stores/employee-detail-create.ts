import { writeAudit } from "@latch/audit";
import {
  ConflictError,
  ForbiddenError,
  narrowPatchSchema,
  surfaceAllows,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import type { SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";
import { z } from "zod";

import {
  EmployeeDetailCreateSchema,
  employeeDetailDescriptor,
  type EmployeeDetailWriteRow,
} from "../descriptors/employee-detail";
import { loadEmployeeDetail } from "../repository/employee-write";
import { insertEmployeeParty } from "../repository/employee-write";
import { computePersonDisplayName } from "../repository/manufacturer-write";

export const parseEmployeeCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof EmployeeDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(EmployeeDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const createEmployeeRowFromBody = (
  id: string,
  body: z.infer<typeof EmployeeDetailCreateSchema>,
): EmployeeDetailWriteRow => {
  const { profile } = body;

  return {
    id,
    display_name: computePersonDisplayName(profile.first_name, profile.last_name),
    first_name: profile.first_name,
    last_name: profile.last_name,
    nick_name: profile.nick_name ?? null,
    avatar_url: profile.avatar_url ?? null,
    latch_user_id: null,
  };
};

export const extendEmployeeDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  employeeDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...employeeDetailBaseDal,
  patch: async (ctx, id, body) => {
    await employeeDetailBaseDal.patch(ctx, id, body);
    return employeeDetailBaseDal.get(ctx, id);
  },
  create: async (ctx, id, body) => {
    const input = parseEmployeeCreateBody(ctx, body);

    if (await loadEmployeeDetail(pool, id)) {
      throw new ConflictError("Employee already exists");
    }

    const row = createEmployeeRowFromBody(id, input);
    const actorId = await getActorId();
    await insertEmployeeParty(pool, actorId, row, {
      phones: input.phones,
      emails: input.emails,
    });

    const fieldIds = ["profile", "staff"];
    if (input.phones !== undefined) {
      fieldIds.push("phones");
    }
    if (input.emails !== undefined) {
      fieldIds.push("emails");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: employeeDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: employeeDetailDescriptor.auditSnapshot(row),
    });

    return employeeDetailBaseDal.get(ctx, id);
  },
});
