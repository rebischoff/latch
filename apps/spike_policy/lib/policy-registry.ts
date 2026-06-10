import { definePolicyRegistry } from "@latch/policy";

import { alphaListSurfacePolicyDef } from "../../spike_codegen/modules/fixture/generated/alpha_list.schema.generated.js";
import { betaDetailSurfacePolicyDef } from "../../spike_codegen/modules/fixture/generated/beta_detail.schema.generated.js";
import { deltaReportSurfacePolicyDef } from "../../spike_codegen/modules/fixture/generated/delta_report.schema.generated.js";
import { gammaFormSurfacePolicyDef } from "../../spike_codegen/modules/fixture/generated/gamma_form.schema.generated.js";
import { zetaInventorySurfacePolicyDef } from "../../spike_codegen/modules/fixture/generated/zeta_inventory.schema.generated.js";
import { roleDetailSurfacePolicyDef } from "../modules/iam/generated/role_detail.schema.generated.js";
import { userRolesDetailSurfacePolicyDef } from "../modules/iam/generated/user_roles_detail.schema.generated.js";

/** Spike harness registry: 5 synthetic business surfaces + 2 IAM surfaces. */
export const spikePolicyRegistry = definePolicyRegistry(
  alphaListSurfacePolicyDef,
  betaDetailSurfacePolicyDef,
  deltaReportSurfacePolicyDef,
  gammaFormSurfacePolicyDef,
  zetaInventorySurfacePolicyDef,
  roleDetailSurfacePolicyDef,
  userRolesDetailSurfacePolicyDef,
);
