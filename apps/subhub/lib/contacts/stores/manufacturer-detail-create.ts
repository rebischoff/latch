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
  ManufacturerDetailCreateSchema,
  manufacturerDetailDescriptor,
  type ManufacturerDetailWriteRow,
} from "../descriptors/manufacturer-detail";
import { loadManufacturerDetail } from "../repository/manufacturer";
import {
  addPartyRole,
  assertManufacturerKindImmutable,
  computeOrgDisplayName,
  computePersonDisplayName,
  insertManufacturerParty,
  PartyRoleActionSchema,
  removePartyRole,
  type PartyRoleValue,
} from "../repository/manufacturer-write";

export const parseManufacturerCreateBody = (
  ctx: PermissionContext,
  body: unknown,
): z.infer<typeof ManufacturerDetailCreateSchema> => {
  if (!surfaceAllows(ctx.manifest, "write")) {
    throw new ForbiddenError();
  }

  const schema = narrowPatchSchema(ManufacturerDetailCreateSchema, ctx.manifest);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const parsePartyRoleActionBody = (
  ctx: PermissionContext,
  action: "add_role" | "remove_role",
  body: unknown,
): z.infer<typeof PartyRoleActionSchema> => {
  if (!surfaceAllows(ctx.manifest, action)) {
    throw new ForbiddenError();
  }

  const parsed = PartyRoleActionSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const createManufacturerRowFromBody = (
  id: string,
  body: z.infer<typeof ManufacturerDetailCreateSchema>,
): ManufacturerDetailWriteRow => {
  const { profile } = body;

  if (profile.kind === "person") {
    const firstName = profile.first_name!;
    const lastName = profile.last_name!;

    return {
      id,
      kind: "person",
      display_name: computePersonDisplayName(firstName, lastName),
      legal_name: null,
      first_name: firstName,
      last_name: lastName,
      dba_name: null,
    };
  }

  const legalName = profile.legal_name!;

  return {
    id,
    kind: "organization",
    display_name: computeOrgDisplayName(legalName, profile.dba_name),
    legal_name: legalName,
    first_name: null,
    last_name: null,
    dba_name: profile.dba_name ?? null,
  };
};

const assertPatchKindImmutable = (
  body: unknown,
  existing: ManufacturerDetailWriteRow,
): void => {
  if (typeof body !== "object" || body === null) {
    return;
  }

  const profile = (body as { profile?: { kind?: string } }).profile;
  assertManufacturerKindImmutable(existing, profile?.kind);
};

export const extendManufacturerDetailDal = (
  pool: Pool,
  getActorId: () => Promise<string>,
  manufacturerDetailBaseDal: SurfaceDal,
): SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
  addRole: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
  removeRole: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
} => ({
  ...manufacturerDetailBaseDal,
  patch: async (ctx, id, body) => {
    const existing = await loadManufacturerDetail(pool, id);
    if (existing) {
      assertPatchKindImmutable(body, existing);
    }

    await manufacturerDetailBaseDal.patch(ctx, id, body);
    return manufacturerDetailBaseDal.get(ctx, id);
  },
  create: async (ctx, id, body) => {
    const input = parseManufacturerCreateBody(ctx, body);

    if (await loadManufacturerDetail(pool, id)) {
      throw new ConflictError("Manufacturer already exists");
    }

    const row = createManufacturerRowFromBody(id, input);
    const actorId = await getActorId();
    await insertManufacturerParty(pool, actorId, row, {
      phones: input.phones,
      emails: input.emails,
    });

    const fieldIds = ["profile"];
    if (input.phones !== undefined) {
      fieldIds.push("phones");
    }
    if (input.emails !== undefined) {
      fieldIds.push("emails");
    }

    await writeAudit({
      actorId: ctx.principal.id,
      action: "insert",
      tableName: manufacturerDetailDescriptor.anchorTable,
      recordId: id,
      moduleId: ctx.surface,
      fieldIds,
      before: null,
      after: manufacturerDetailDescriptor.auditSnapshot(row),
    });

    return manufacturerDetailBaseDal.get(ctx, id);
  },
  addRole: async (ctx, id, body) => {
    const input = parsePartyRoleActionBody(ctx, "add_role", body);
    await manufacturerDetailBaseDal.get(ctx, id);
    const actorId = await getActorId();

    await addPartyRole(pool, actorId, id, input.role as PartyRoleValue);

    await writeAudit({
      actorId: ctx.principal.id,
      action: "update",
      tableName: "party_role",
      recordId: `${id}:${input.role}`,
      moduleId: ctx.surface,
      fieldIds: [],
      before: null,
      after: { party_id: id, role: input.role },
      patch: { add_role: input.role },
    });

    return manufacturerDetailBaseDal.get(ctx, id);
  },
  removeRole: async (ctx, id, body) => {
    const input = parsePartyRoleActionBody(ctx, "remove_role", body);
    await manufacturerDetailBaseDal.get(ctx, id);
    const actorId = await getActorId();

    await removePartyRole(pool, actorId, id, input.role as PartyRoleValue);

    await writeAudit({
      actorId: ctx.principal.id,
      action: "update",
      tableName: "party_role",
      recordId: `${id}:${input.role}`,
      moduleId: ctx.surface,
      fieldIds: [],
      before: { party_id: id, role: input.role },
      after: null,
      patch: { remove_role: input.role },
    });

    if (input.role === "manufacturer") {
      return { id };
    }

    return manufacturerDetailBaseDal.get(ctx, id);
  },
});
