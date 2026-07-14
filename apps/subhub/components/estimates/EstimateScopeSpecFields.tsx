"use client";

import { Checkbox, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import { Controller, useFormContext, useWatch, type FieldPath } from "react-hook-form";

import { conditionPathToRhf } from "@/components/estimates/estimate-bucket-paths";
import type { EstimateBucketBinding } from "@/components/estimates/estimate-line-selection";
import {
  type EstimateConditionSpecFormRow,
  type EstimateLineEditorFormValues,
} from "@/components/estimates/estimate-line-tree";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import { SpecNumberValuePopover } from "@/components/spec/SpecNumberValuePopover";
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

const BOOLEAN_SPEC_OPTIONS = [
  { value: true, label: "True" },
  { value: false, label: "False" },
];

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
) => {
  setValue(specFieldPath(binding, specIndex, "spec_option_id"), null, {
    shouldDirty: true,
  });
  setValue(specFieldPath(binding, specIndex, "option_display_name"), null, {
    shouldDirty: true,
  });
  setValue(specFieldPath(binding, specIndex, "value_number"), null, {
    shouldDirty: true,
  });
  setValue(specFieldPath(binding, specIndex, "value_number_max"), null, {
    shouldDirty: true,
  });
  setValue(specFieldPath(binding, specIndex, "value_boolean"), null, {
    shouldDirty: true,
  });
};

const seedOwnSpecValue = (
  setValue: ReturnType<typeof useFormContext<EstimateLineEditorFormValues>>["setValue"],
  binding: EstimateBucketBinding,
  specIndex: number,
  effective: EstimateConditionSpecFormRow,
) => {
  setValue(
    specFieldPath(binding, specIndex, "spec_option_id"),
    effective.spec_option_id,
    { shouldDirty: true },
  );
  setValue(
    specFieldPath(binding, specIndex, "option_display_name"),
    effective.option_display_name ?? null,
    { shouldDirty: true },
  );
  setValue(
    specFieldPath(binding, specIndex, "value_number"),
    effective.value_number,
    { shouldDirty: true },
  );
  setValue(
    specFieldPath(binding, specIndex, "value_number_max"),
    effective.value_number_max ?? null,
    { shouldDirty: true },
  );
  setValue(
    specFieldPath(binding, specIndex, "value_boolean"),
    effective.value_boolean,
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
            clearOwnSpecValue(setValue, binding, ownSpecIndex);
          }
        }}
      />
    ) : undefined;

  const ownValueSource =
    ownSpec && isBucketSpecValueSet(ownSpec) ? ownSpec : null;
  const shownOptionId = ownValueSource?.spec_option_id ?? effectiveSpec.spec_option_id;
  const shownNumberMin = ownValueSource?.value_number ?? effectiveSpec.value_number;
  const shownNumberMax = ownValueSource?.value_number_max ?? effectiveSpec.value_number_max;
  const shownBoolean =
    ownValueSource?.value_boolean ?? effectiveSpec.value_boolean;

  if (valueType === "enum") {
    const options = (effectiveSpec.options ?? []).map((option) => ({
      value: option.id,
      label: option.display_name,
    }));

    if (ownSpecIndex === null || !editable) {
      const readOnlyLabel =
        options.find((option) => option.value === shownOptionId)?.label ?? null;

      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <Typography.Text type={readOnlyLabel ? undefined : "secondary"}>
            {readOnlyLabel ?? "No filter"}
          </Typography.Text>
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
                disabled={disabled || !editable}
                options={options}
                placeholder="Select…"
                style={{ width: "100%" }}
                value={controlValue}
                onChange={(next) => {
                  if (!editable) {
                    return;
                  }
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
    if (ownSpecIndex === null || !editable) {
      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <Select
            allowClear={false}
            disabled
            options={BOOLEAN_SPEC_OPTIONS}
            placeholder="Select…"
            style={{ width: "100%" }}
            value={shownBoolean ?? undefined}
          />
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
              <Select
                allowClear={editable}
                disabled={disabled || !editable}
                options={BOOLEAN_SPEC_OPTIONS}
                placeholder="Select…"
                style={{ width: "100%" }}
                value={controlValue ?? undefined}
                onChange={(next) => {
                  if (!editable) {
                    return;
                  }
                  onChange(next ?? null);
                }}
              />
            </FormFieldItem>
          );
        }}
      />
    );
  }

  if (valueType === "number") {
    const unitMeta = {
      decimal_places: effectiveSpec.decimal_places ?? null,
      unit_symbol: effectiveSpec.unit_symbol ?? null,
      to_canonical_factor: effectiveSpec.to_canonical_factor ?? 1,
    };

    if (ownSpecIndex === null || !editable) {
      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <SpecNumberValuePopover
            emptyLabel="No filter"
            readOnly
            readOnlyEmptyLabel="No filter"
            unitMeta={unitMeta}
            valueMax={shownNumberMax ?? null}
            valueMin={shownNumberMin}
            onMaxChange={() => {}}
            onMinChange={() => {}}
          />
        </FormFieldItem>
      );
    }

    return (
      <Controller<EstimateLineEditorFormValues>
        name={specFieldPath(binding, ownSpecIndex, "value_number")}
        render={({ field: { value: minValue, onChange: onMinChange } }) => (
          <Controller<EstimateLineEditorFormValues>
            name={specFieldPath(binding, ownSpecIndex, "value_number_max")}
            render={({ field: { value: maxValue, onChange: onMaxChange } }) => {
              const ownMin = typeof minValue === "number" ? minValue : null;
              const ownMax = typeof maxValue === "number" ? maxValue : null;
              const controlMin = ownMin ?? effectiveSpec.value_number;
              const controlMax = ownMax ?? effectiveSpec.value_number_max ?? null;

              return (
                <FormFieldItem label={label} controlPrefix={controlPrefix}>
                  <SpecNumberValuePopover
                    disabled={disabled || !editable}
                    emptyLabel="No filter"
                    unitMeta={unitMeta}
                    valueMax={controlMax}
                    valueMin={controlMin}
                    onMaxChange={(next) => {
                      if (!editable) {
                        return;
                      }
                      onMaxChange(next);
                    }}
                    onMinChange={(next) => {
                      if (!editable) {
                        return;
                      }
                      onMinChange(next);
                    }}
                  />
                </FormFieldItem>
              );
            }}
          />
        )}
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
