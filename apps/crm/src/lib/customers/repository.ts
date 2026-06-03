import type { PermissionContext } from "@latch/contracts";
import { NotFoundError, surfaceAllows } from "@latch/contracts";
import { createSurfaceDal } from "@latch/dal";

import { createCustomerStoreAdapter } from "../../../db/store.js";
import type { MemoryJobStore } from "../../../db/memory-store.js";
import { customerDetailDescriptor } from "./descriptors.js";
import type { ProjectedCustomerDetail } from "./project.js";

export type CustomersDal = {
  get: (ctx: PermissionContext, id: string) => ProjectedCustomerDetail;
  patch: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<ProjectedCustomerDetail>;
};

const assertCustomerDetailRead = (ctx: PermissionContext): void => {
  if (!surfaceAllows(ctx.manifest, "read")) {
    throw new NotFoundError();
  }
};

export const createCustomersDal = (store: MemoryJobStore): CustomersDal => {
  const adapter = createCustomerStoreAdapter(store);
  const detail = createSurfaceDal(customerDetailDescriptor, adapter);

  return {
    get: (ctx, id) => {
      assertCustomerDetailRead(ctx);
      return detail.get(ctx, id) as ProjectedCustomerDetail;
    },
    patch: async (ctx, id, body) => {
      assertCustomerDetailRead(ctx);
      return (await detail.patch(ctx, id, body)) as ProjectedCustomerDetail;
    },
  };
};
