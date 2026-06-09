import { definePolicyRegistry } from "@latch/policy";

import { widgetListSurfacePolicyDef } from "../../spike_codegen/modules/widget/generated/widget_list.schema.generated.js";
import { roleDetailSurfacePolicyDef } from "../modules/iam/generated/role_detail.schema.generated.js";
import { userRolesDetailSurfacePolicyDef } from "../modules/iam/generated/user_roles_detail.schema.generated.js";

/** Spike harness registry: business vocabulary + IAM surfaces. */
export const spikePolicyRegistry = definePolicyRegistry(
  widgetListSurfacePolicyDef,
  roleDetailSurfacePolicyDef,
  userRolesDetailSurfacePolicyDef,
);
