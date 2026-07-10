"use client";

import { Checkbox, InputNumber, Select, Switch, Typography } from "antd";
import { useEffect, useState } from "react";
import { Controller, useFormContext, useWatch, type FieldPath } from "react-hook-form";

import { conditionPathToRhf } from "@/components/estimates/estimate-bucket-paths";
import type { EstimateBucketBinding } from "@/components/estimates/estimate-line-selection";
import {
  type EstimateConditionSpecFormRow,
  type EstimateLineEditorFormValues,
} from "@/components/estimates/estimate-line-tree";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import {
  isBucketSpecValueSet,
  resolveEffectiveBucketSpecs,
} from "@/lib/estimates/estimate-bucket-specs-form";

type EstimateScopeSpecFieldsProps = {
  binding: EstimateBucketBinding;
  disabled: boolean;
  isChild: boolean;
  writable: boolean;
};

const specFieldPath = (
  binding: EstimateBucketBinding,
  specIndex: number,
  key: keyof EstimateConditionSpecFormRow,
): FieldPath<EstimateLineEditorFormValues> =>
  conditionPathToRhf(binding.conditionPath, `specs.${specIndex}.${key}`);

const clearOwnSpecValue = (
  setValue: ReturnType<typeof useFormContext<EstimateLineEditorFormValues>>["setValue"],
  binding: EstimateBucketBinding,
  specIndex: number,
  valueType: EstimateConditionSpecFormRow["value_type"],
) => {
  if (valueType === "boolean") {
    setValue(specFieldPath(binding, specIndex, "value_boolean"), null, {
      shouldDirty: true,
    });
    return;
  }
  if (valueType === "number") {
    setValue(specFieldPath(binding, specIndex, "value_number"), null, {
      shouldDirty: true,
    });
    return;
  }
  setValue(specFieldPath(binding, specIndex, "spec_option_id"), null, {
    shouldDirty: true,
  });
  setValue(specFieldPath(binding, specIndex, "option_display_name"), null, {
    shouldDirty: true,
  });
};

const seedOwnSpecValue = (
  setValue: ReturnType<typeof useFormContext<EstimateLineEditorFormValues>>["setValue"],
  binding: EstimateBucketBinding,
  specIndex: number,
  effective: EstimateConditionSpecFormRow,
) => {
  if (effective.value_type === "boolean") {
    setValue(
      specFieldPath(binding, specIndex, "value_boolean"),
      effective.value_boolean,
      { shouldDirty: true },
    );
    return;
  }
  if (effective.value_type === "number") {
    setValue(
      specFieldPath(binding, specIndex, "value_number"),
      effective.value_number,
      { shouldDirty: true },
    );
    return;
  }
  setValue(
    specFieldPath(binding, specIndex, "spec_option_id"),
    effective.spec_option_id,
    { shouldDirty: true },
  );
};

type SpecControlProps = {
  binding: EstimateBucketBinding;
  disabled: boolean;
  effectiveSpec: EstimateConditionSpecFormRow;
  isChild: boolean;
  ownSpec: EstimateConditionSpecFormRow | null;
  ownSpecIndex: number | null;
  writable: boolean;
};

const SpecControl = ({
  binding,
  disabled,
  effectiveSpec,
  isChild,
  ownSpec,
  ownSpecIndex,
  writable,
}: SpecControlProps) => {
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();
  const label = effectiveSpec.def_display_name ?? "Spec";
  const valueType = effectiveSpec.value_type ?? "enum";
  const hasStoredOverride = ownSpec ? isBucketSpecValueSet(ownSpec) : false;
  // Session override intent — needed when ancestry is unset (seeding null cannot flip hasOverride).
  const [forceOverride, setForceOverride] = useState(false);
  const pathKey = `${binding.conditionPath.join(".")}:${effectiveSpec.spec_def_id}`;
  useEffect(() => {
    setForceOverride(false);
  }, [pathKey]);
  const hasOverride = !isChild || hasStoredOverride || forceOverride;
  const editable = writable && ownSpecIndex !== null && hasOverride;
  const effectiveIsSet = isBucketSpecValueSet(effectiveSpec);

  const controlPrefix =
    isChild && ownSpecIndex !== null ? (
      <Checkbox
        checked={hasOverride}
        disabled={disabled || !writable}
        onChange={(event) => {
          if (event.target.checked) {
            setForceOverride(true);
            if (effectiveIsSet) {
              seedOwnSpecValue(setValue, binding, ownSpecIndex, effectiveSpec);
            }
          } else {
            setForceOverride(false);
            clearOwnSpecValue(setValue, binding, ownSpecIndex, valueType);
          }
        }}
      />
    ) : undefined;

  if (valueType === "enum") {
    const options = (effectiveSpec.options ?? []).map((option) => ({
      value: option.id,
      label: option.display_name,
    }));
    const shownOptionId =
      (ownSpec && isBucketSpecValueSet(ownSpec) ? ownSpec.spec_option_id : null) ??
      effectiveSpec.spec_option_id;

    if (ownSpecIndex === null) {
      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <Select
            allowClear={false}
            style={{ width: "100%" }}
            placeholder="Select…"
            options={options}
            value={shownOptionId}
            disabled
          />
        </FormFieldItem>
      );
    }

    return (
      <Controller<EstimateLineEditorFormValues>
        name={specFieldPath(binding, ownSpecIndex, "spec_option_id")}
        render={({ field: { value, onChange } }) => {
          const ownOptionId = typeof value === "string" ? value : null;
          const controlValue = ownOptionId ?? effectiveSpec.spec_option_id;

          return (
            <FormFieldItem label={label} controlPrefix={controlPrefix}>
              <Select
                allowClear={editable}
                style={{ width: "100%" }}
                placeholder="Select…"
                options={options}
                value={controlValue}
                disabled={disabled || !editable}
                onChange={(next) => {
                  if (!editable) return;
                  onChange(next ?? null);
                }}
              />
            </FormFieldItem>
          );
        }}
      />
    );
  }

  if (valueType === "boolean") {
    const shownValue =
      (ownSpec && isBucketSpecValueSet(ownSpec) ? ownSpec.value_boolean : null) ??
      effectiveSpec.value_boolean;

    if (ownSpecIndex === null) {
      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <Switch checked={shownValue === true} disabled />
        </FormFieldItem>
      );
    }

    return (
      <Controller<EstimateLineEditorFormValues>
        name={specFieldPath(binding, ownSpecIndex, "value_boolean")}
        render={({ field: { value, onChange } }) => {
          const ownValue = value === true || value === false ? value : null;
          const controlValue = ownValue ?? effectiveSpec.value_boolean;

          return (
            <FormFieldItem label={label} controlPrefix={controlPrefix}>
              <Switch
                checked={controlValue === true}
                disabled={disabled || !editable}
                onChange={(checked) => {
                  if (!editable) return;
                  onChange(checked);
                }}
              />
            </FormFieldItem>
          );
        }}
      />
    );
  }

  if (valueType === "number") {
    const shownValue =
      (ownSpec && isBucketSpecValueSet(ownSpec) ? ownSpec.value_number : null) ??
      effectiveSpec.value_number;

    if (ownSpecIndex === null) {
      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <InputNumber
            addonAfter={effectiveSpec.unit_symbol ?? undefined}
            disabled
            placeholder="No filter"
            precision={effectiveSpec.decimal_places ?? undefined}
            style={{ width: "100%" }}
            value={shownValue}
          />
        </FormFieldItem>
      );
    }

    return (
      <Controller<EstimateLineEditorFormValues>
        name={specFieldPath(binding, ownSpecIndex, "value_number")}
        render={({ field: { value, onChange } }) => {
          const ownValue = typeof value === "number" ? value : null;
          const controlValue = ownValue ?? effectiveSpec.value_number;

          return (
            <FormFieldItem label={label} controlPrefix={controlPrefix}>
              <InputNumber
                addonAfter={effectiveSpec.unit_symbol ?? undefined}
                disabled={disabled || !editable}
                placeholder="No filter"
                precision={effectiveSpec.decimal_places ?? undefined}
                style={{ width: "100%" }}
                value={controlValue}
                onChange={(next) => {
                  if (!editable) return;
                  onChange(next ?? null);
                }}
              />
            </FormFieldItem>
          );
        }}
      />
    );
  }

  return (
    <FormFieldItem label={label} controlPrefix={controlPrefix}>
      <Typography.Text>—</Typography.Text>
    </FormFieldItem>
  );
};

export const EstimateScopeSpecFields = ({
  binding,
  disabled,
  isChild,
  writable,
}: EstimateScopeSpecFieldsProps) => {
  const specsPath = conditionPathToRhf(binding.conditionPath, "specs");
  const conditions = useWatch({ name: "conditions" }) as
    | EstimateLineEditorFormValues["conditions"]
    | undefined;
  const ownSpecs =
    (useWatch({
      name: specsPath,
    }) as EstimateConditionSpecFormRow[] | undefined) ?? [];

  const effectiveSpecs = resolveEffectiveBucketSpecs(
    conditions ?? [],
    binding.conditionPath,
  );

  if (!effectiveSpecs.length) {
    return null;
  }

  return (
    <>
      {effectiveSpecs.map((effectiveSpec) => {
        const ownSpecIndex = ownSpecs.findIndex(
          (spec) => spec.spec_def_id === effectiveSpec.spec_def_id,
        );
        const ownSpec = ownSpecIndex >= 0 ? ownSpecs[ownSpecIndex]! : null;

        return (
          <SpecControl
            key={effectiveSpec.spec_def_id}
            binding={binding}
            disabled={disabled}
            effectiveSpec={effectiveSpec}
            isChild={isChild}
            ownSpec={ownSpec}
            ownSpecIndex={ownSpecIndex >= 0 ? ownSpecIndex : null}
            writable={writable}
          />
        );
      })}
    </>
  );
};
