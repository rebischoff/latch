import type { FieldPath } from "react-hook-form";

import type { EstimateLineEditorFormValues } from "@/components/estimates/estimate-line-tree";
import type { EstimateBucketBinding } from "@/components/estimates/estimate-line-selection";
import { getConditionAtPath } from "@/components/estimates/estimate-line-selection";

export const conditionPathToRhf = (
  conditionPath: number[],
  suffix: string,
): FieldPath<EstimateLineEditorFormValues> => {
  let path = "conditions";
  for (let i = 0; i < conditionPath.length; i += 1) {
    path += `.${conditionPath[i]!}`;
    if (i < conditionPath.length - 1) {
      path += ".conditions";
    }
  }
  return `${path}.${suffix}` as FieldPath<EstimateLineEditorFormValues>;
};

export { getConditionAtPath };

export const bindingIsRoot = (binding: EstimateBucketBinding): boolean =>
  binding.conditionPath.length === 1;

export const bindingIsChild = (binding: EstimateBucketBinding): boolean =>
  binding.conditionPath.length > 1;

/** @deprecated Prefer bindingIsChild — roots have no inherit checkboxes. */
export const bindingIsCondition = bindingIsChild;
