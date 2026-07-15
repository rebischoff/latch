"use client";

import { Checkbox } from "antd";
import { useFormContext, useWatch } from "react-hook-form";

import { conditionPathToRhf } from "@/components/estimates/estimate-bucket-paths";
import type { EstimateLineEditorFormValues } from "@/components/estimates/estimate-line-tree";
import type { EstimateBucketBinding } from "@/components/estimates/estimate-line-selection";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import {
  resolveEffectiveIncludeDiscontinued,
  resolveEffectiveLaborOnly,
} from "@/lib/estimates/estimate-bucket-specs-form";

type BooleanY4FieldProps = {
  binding: EstimateBucketBinding;
  disabled: boolean;
  isChild: boolean;
  label: string;
  valueKey: "labor_only" | "include_discontinued";
  explicitKey: "labor_only_explicit" | "include_discontinued_explicit";
  resolveEffective: (
    conditions: EstimateLineEditorFormValues["conditions"],
    conditionPath: number[],
  ) => boolean;
  writable: boolean;
};

const BooleanY4Field = ({
  binding,
  disabled,
  isChild,
  label,
  valueKey,
  explicitKey,
  resolveEffective,
  writable,
}: BooleanY4FieldProps) => {
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();
  const valuePath = conditionPathToRhf(binding.conditionPath, valueKey);
  const explicitPath = conditionPathToRhf(binding.conditionPath, explicitKey);

  const conditions = useWatch({ name: "conditions" }) as
    | EstimateLineEditorFormValues["conditions"]
    | undefined;
  const ownValue = useWatch({ name: valuePath }) as boolean | undefined;
  const isExplicit = useWatch({ name: explicitPath }) as boolean | undefined;
  // Roots always own; children use the explicit flag as Override checkbox.
  const hasOverride = isChild ? isExplicit === true : true;
  const resolved = resolveEffective(conditions ?? [], binding.conditionPath);
  const displayValue = hasOverride ? ownValue === true : resolved;
  const editable = writable && hasOverride;

  return (
    <FormFieldItem
      label={label}
      controlPrefix={
        isChild ? (
          <Checkbox
            checked={hasOverride}
            disabled={disabled || !writable}
            onChange={(event) => {
              if (event.target.checked) {
                setValue(explicitPath, true, { shouldDirty: true });
                setValue(valuePath, resolved, { shouldDirty: true });
              } else {
                setValue(explicitPath, false, { shouldDirty: true });
                setValue(valuePath, false, { shouldDirty: true });
              }
            }}
          />
        ) : undefined
      }
    >
      <Checkbox
        checked={displayValue}
        disabled={disabled || !editable}
        onChange={(event) => {
          if (!editable) return;
          setValue(explicitPath, true, { shouldDirty: true });
          setValue(valuePath, event.target.checked, { shouldDirty: true });
        }}
      />
    </FormFieldItem>
  );
};

type EstimateConditionBooleanY4FieldsProps = {
  binding: EstimateBucketBinding;
  disabled: boolean;
  isChild: boolean;
  writable: boolean;
};

export const EstimateConditionBooleanY4Fields = ({
  binding,
  disabled,
  isChild,
  writable,
}: EstimateConditionBooleanY4FieldsProps) => (
  <>
    <BooleanY4Field
      binding={binding}
      disabled={disabled}
      isChild={isChild}
      label="Labor only"
      valueKey="labor_only"
      explicitKey="labor_only_explicit"
      resolveEffective={resolveEffectiveLaborOnly}
      writable={writable}
    />
    <BooleanY4Field
      binding={binding}
      disabled={disabled}
      isChild={isChild}
      label="Include discontinued"
      valueKey="include_discontinued"
      explicitKey="include_discontinued_explicit"
      resolveEffective={resolveEffectiveIncludeDiscontinued}
      writable={writable}
    />
  </>
);
