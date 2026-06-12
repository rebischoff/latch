import { definePolicyRegistry } from "@latch/policy";

import { jobDetailSurfacePolicyDef } from "../modules/job/generated/job_detail.schema.generated.js";
import { jobListSurfacePolicyDef } from "../modules/job/generated/job_list.schema.generated.js";

export const tempAppRegistry = definePolicyRegistry(
  jobDetailSurfacePolicyDef,
  jobListSurfacePolicyDef,
);
