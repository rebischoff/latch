"use client";

import { Button, Checkbox, Flex, InputNumber, Select, Switch, Typography } from "antd";
import { useEffect, useState } from "react";
import { Controller, useFormContext, useWatch, type FieldPath } from "react-hook-form";

import { conditionPathToRhf } from "@/components/estimates/estimate-bucket-paths";
import type { EstimateBucketBinding } from "@/components/estimates/estimate-line-selection";
import {
  type EstimateConditionSpecFormRow,
  type EstimateConditionSpecPresetFormRow,
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

const CUSTOM_PRESET_KEY = "__custom__";

const specFieldPath = (
  binding: EstimateBucketBinding,
  specIndex: number,
  key: keyof EstimateConditionSpecFormRow,
): FieldPath<EstimateLineEditorFormValues> =>
  conditionPathToRhf(binding.conditionPath, `specs.${specIndex}.${key}`);

const presetLabelForId = (
  presets: EstimateConditionSpecPresetFormRow[],
  presetId: string | null | undefined,
): string | null => {
  if (!presetId) {
    return null;
  }
  return presets.find((preset) => preset.id === presetId)?.label ?? null;
};

const clearOwnSpecValue = (
  setValue: ReturnType<typeof useFormContext<EstimateLineEditorFormValues>>["setValue"],
  binding: EstimateBucketBinding,
  specIndex: number,
) => {
  setValue(specFieldPath(binding, specIndex, "spec_threshold_preset_id"), null, {
    shouldDirty: true,
  });
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
    specFieldPath(binding, specIndex, "spec_threshold_preset_id"),
    effective.spec_threshold_preset_id ?? null,
    { shouldDirty: true },
  );
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

type PresetChipRowProps = {
  disabled: boolean;
  editable: boolean;
  onSelect: (presetId: string | typeof CUSTOM_PRESET_KEY | null) => void;
  presets: EstimateConditionSpecPresetFormRow[];
  selectedKey: string | typeof CUSTOM_PRESET_KEY | null;
  showCustom: boolean;
};

const PresetChipRow = ({
  disabled,
  editable,
  onSelect,
  presets,
  selectedKey,
  showCustom,
}: PresetChipRowProps) => (
  <Flex wrap gap={8}>
    {presets.map((preset) => {
      const selected = selectedKey === preset.id;
      return (
        <Button
          key={preset.id}
          disabled={disabled || !editable}
          size="small"
          type={selected ? "primary" : "default"}
          onClick={() => {
            if (!editable) {
              return;
            }
            onSelect(selected ? null : preset.id);
          }}
        >
          {preset.label}
        </Button>
      );
    })}
    {showCustom ? (
      <Button
        disabled={disabled || !editable}
        size="small"
        type={selectedKey === CUSTOM_PRESET_KEY ? "primary" : "default"}
        onClick={() => {
          if (!editable) {
            return;
          }
          onSelect(selectedKey === CUSTOM_PRESET_KEY ? null : CUSTOM_PRESET_KEY);
        }}
      >
        Custom
      </Button>
    ) : null}
  </Flex>
);

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
  const presets = [...(effectiveSpec.presets ?? [])].sort(
    (left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label),
  );
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
  const shownPresetId = ownValueSource?.spec_threshold_preset_id ?? effectiveSpec.spec_threshold_preset_id;
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

    if (presets.length > 0) {
      const enumSelectedKey: string | typeof CUSTOM_PRESET_KEY | null = shownPresetId
        ? shownPresetId
        : shownOptionId
          ? CUSTOM_PRESET_KEY
          : null;

      if (ownSpecIndex === null || !editable) {
        const readOnlyLabel =
          presetLabelForId(presets, shownPresetId) ??
          options.find((option) => option.value === shownOptionId)?.label ??
          null;

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
          name={specFieldPath(binding, ownSpecIndex, "spec_threshold_preset_id")}
          render={({ field: { value: presetValue, onChange: onPresetChange } }) => (
            <Controller<EstimateLineEditorFormValues>
              name={specFieldPath(binding, ownSpecIndex, "spec_option_id")}
              render={({ field: { value: optionValue, onChange: onOptionChange } }) => {
                const ownPresetId = typeof presetValue === "string" ? presetValue : null;
                const ownOptionId = typeof optionValue === "string" ? optionValue : null;
                const selectedKey: string | typeof CUSTOM_PRESET_KEY | null = ownPresetId
                  ? ownPresetId
                  : ownOptionId
                    ? CUSTOM_PRESET_KEY
                    : null;

                return (
                  <FormFieldItem label={label} controlPrefix={controlPrefix}>
                    <Flex vertical gap={8}>
                      <PresetChipRow
                        disabled={disabled}
                        editable={editable}
                        presets={presets}
                        selectedKey={selectedKey}
                        showCustom
                        onSelect={(next) => {
                          if (!editable) {
                            return;
                          }
                          if (next === null) {
                            clearOwnSpecValue(setValue, binding, ownSpecIndex);
                            return;
                          }
                          if (next === CUSTOM_PRESET_KEY) {
                            onPresetChange(null);
                            return;
                          }
                          onPresetChange(next);
                          onOptionChange(null);
                          setValue(
                            specFieldPath(binding, ownSpecIndex, "option_display_name"),
                            null,
                            { shouldDirty: true },
                          );
                        }}
                      />
                      {selectedKey === CUSTOM_PRESET_KEY ? (
                        <Select
                          allowClear
                          disabled={disabled || !editable}
                          options={options}
                          placeholder="Select…"
                          style={{ width: "100%" }}
                          value={ownOptionId}
                          onChange={(next) => {
                            if (!editable) {
                              return;
                            }
                            onPresetChange(null);
                            onOptionChange(next ?? null);
                          }}
                        />
                      ) : null}
                    </Flex>
                  </FormFieldItem>
                );
              }}
            />
          )}
        />
      );
    }

    if (ownSpecIndex === null) {
      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <Select
            allowClear={false}
            disabled
            options={options}
            placeholder="Select…"
            style={{ width: "100%" }}
            value={shownOptionId}
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
                  setValue(
                    specFieldPath(binding, ownSpecIndex, "spec_threshold_preset_id"),
                    null,
                    { shouldDirty: true },
                  );
                }}
              />
            </FormFieldItem>
          );
        }}
      />
    );
  }

  if (valueType === "boolean") {
    if (ownSpecIndex === null) {
      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <Switch checked={shownBoolean === true} disabled />
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
                  if (!editable) {
                    return;
                  }
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
    const unitAfter = effectiveSpec.unit_symbol ?? undefined;
    const precision = effectiveSpec.decimal_places ?? undefined;

    if (presets.length > 0) {
      const numberSelectedKey: string | typeof CUSTOM_PRESET_KEY | null = shownPresetId
        ? shownPresetId
        : shownNumberMin !== null || shownNumberMax !== null
          ? CUSTOM_PRESET_KEY
          : null;

      if (ownSpecIndex === null || !editable) {
        const readOnlyLabel =
          presetLabelForId(presets, shownPresetId) ??
          (shownNumberMin !== null || shownNumberMax !== null
            ? [
                shownNumberMin !== null ? String(shownNumberMin) : "…",
                shownNumberMax !== null ? String(shownNumberMax) : "…",
              ].join(" – ")
            : null);

        return (
          <FormFieldItem label={label} controlPrefix={controlPrefix}>
            <Typography.Text type={readOnlyLabel ? undefined : "secondary"}>
              {readOnlyLabel ? `${readOnlyLabel}${unitAfter ? ` ${unitAfter}` : ""}` : "No filter"}
            </Typography.Text>
          </FormFieldItem>
        );
      }

      return (
        <Controller<EstimateLineEditorFormValues>
          name={specFieldPath(binding, ownSpecIndex, "spec_threshold_preset_id")}
          render={({ field: { value: presetValue, onChange: onPresetChange } }) => (
            <Controller<EstimateLineEditorFormValues>
              name={specFieldPath(binding, ownSpecIndex, "value_number")}
              render={({ field: { value: minValue, onChange: onMinChange } }) => (
                <Controller<EstimateLineEditorFormValues>
                  name={specFieldPath(binding, ownSpecIndex, "value_number_max")}
                  render={({ field: { value: maxValue, onChange: onMaxChange } }) => {
                    const ownPresetId = typeof presetValue === "string" ? presetValue : null;
                    const ownMin = typeof minValue === "number" ? minValue : null;
                    const ownMax = typeof maxValue === "number" ? maxValue : null;
                    const selectedKey: string | typeof CUSTOM_PRESET_KEY | null = ownPresetId
                      ? ownPresetId
                      : ownMin !== null || ownMax !== null
                        ? CUSTOM_PRESET_KEY
                        : null;

                    return (
                      <FormFieldItem label={label} controlPrefix={controlPrefix}>
                        <Flex vertical gap={8}>
                          <PresetChipRow
                            disabled={disabled}
                            editable={editable}
                            presets={presets}
                            selectedKey={selectedKey}
                            showCustom
                            onSelect={(next) => {
                              if (!editable) {
                                return;
                              }
                              if (next === null) {
                                clearOwnSpecValue(setValue, binding, ownSpecIndex);
                                return;
                              }
                              if (next === CUSTOM_PRESET_KEY) {
                                onPresetChange(null);
                                return;
                              }
                              onPresetChange(next);
                              onMinChange(null);
                              onMaxChange(null);
                            }}
                          />
                          {selectedKey === CUSTOM_PRESET_KEY ? (
                            <Flex gap={8}>
                              <InputNumber
                                addonAfter={unitAfter}
                                disabled={disabled || !editable}
                                placeholder="Min"
                                precision={precision}
                                style={{ flex: 1 }}
                                value={ownMin}
                                onChange={(next) => {
                                  if (!editable) {
                                    return;
                                  }
                                  onPresetChange(null);
                                  onMinChange(next ?? null);
                                }}
                              />
                              <InputNumber
                                addonAfter={unitAfter}
                                disabled={disabled || !editable}
                                placeholder="Max"
                                precision={precision}
                                style={{ flex: 1 }}
                                value={ownMax}
                                onChange={(next) => {
                                  if (!editable) {
                                    return;
                                  }
                                  onPresetChange(null);
                                  onMaxChange(next ?? null);
                                }}
                              />
                            </Flex>
                          ) : null}
                        </Flex>
                      </FormFieldItem>
                    );
                  }}
                />
              )}
            />
          )}
        />
      );
    }

    if (ownSpecIndex === null) {
      return (
        <FormFieldItem label={label} controlPrefix={controlPrefix}>
          <Flex gap={8}>
            <InputNumber
              addonAfter={unitAfter}
              disabled
              placeholder="Min"
              precision={precision}
              style={{ flex: 1 }}
              value={shownNumberMin}
            />
            <InputNumber
              addonAfter={unitAfter}
              disabled
              placeholder="Max"
              precision={precision}
              style={{ flex: 1 }}
              value={shownNumberMax}
            />
          </Flex>
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
                  <Flex gap={8}>
                    <InputNumber
                      addonAfter={unitAfter}
                      disabled={disabled || !editable}
                      placeholder="Min"
                      precision={precision}
                      style={{ flex: 1 }}
                      value={controlMin}
                      onChange={(next) => {
                        if (!editable) {
                          return;
                        }
                        onMinChange(next ?? null);
                        setValue(
                          specFieldPath(binding, ownSpecIndex, "spec_threshold_preset_id"),
                          null,
                          { shouldDirty: true },
                        );
                      }}
                    />
                    <InputNumber
                      addonAfter={unitAfter}
                      disabled={disabled || !editable}
                      placeholder="Max"
                      precision={precision}
                      style={{ flex: 1 }}
                      value={controlMax}
                      onChange={(next) => {
                        if (!editable) {
                          return;
                        }
                        onMaxChange(next ?? null);
                        setValue(
                          specFieldPath(binding, ownSpecIndex, "spec_threshold_preset_id"),
                          null,
                          { shouldDirty: true },
                        );
                      }}
                    />
                  </Flex>
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
