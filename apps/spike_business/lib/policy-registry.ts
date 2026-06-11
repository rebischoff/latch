import { definePolicyRegistry } from "@latch/policy";

import { widgetDetailSurfacePolicyDef } from "../modules/widget/generated/widget_detail.schema.generated.js";
import { widgetListSurfacePolicyDef } from "../modules/widget/generated/widget_list.schema.generated.js";

/** Business harness registry — widget list + detail surfaces. */
export const spikeBusinessRegistry = definePolicyRegistry(
  widgetListSurfacePolicyDef,
  widgetDetailSurfacePolicyDef,
);
