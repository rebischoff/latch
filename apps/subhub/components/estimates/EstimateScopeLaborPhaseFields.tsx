"use client";

import { Checkbox, Select } from "antd";
import { useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { conditionPathToRhf } from "@/components/estimates/estimate-bucket-paths";
import type {
  EstimateConditionLaborPhaseFormRow,
  EstimateLineEditorFormValues,
} from "@/components/estimates/estimate-line-tree";
import type { EstimateBucketBinding } from "@/components/estimates/estimate-line-selection";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import { resolveEffectiveLaborPhases } from "@/lib/estimates/estimate-bucket-specs-form";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";

type EstimateScopeLaborPhaseFieldsProps = {
  binding: EstimateBucketBinding;
  disabled: boolean;
  isChild: boolean;
  writable: boolean;
};

const unwrapCatalogName = (row: Record<string, unknown>): string => {
  const nameField = row.name as { name?: string } | undefined;
  return nameField?.name ?? "";
};

export const EstimateScopeLaborPhaseFields = ({
  binding,
  disabled,
  isChild,
  writable,
}: EstimateScopeLaborPhaseFieldsProps) => {
  const { control, setValue } = useFormContext<EstimateLineEditorFormValues>();

  const phasesPath = conditionPathToRhf(
    binding.conditionPath,
    "included_labor_phases",
  );
  const explicitPath = conditionPathToRhf(
    binding.conditionPath,
    "labor_phases_explicit",
  );

  const conditions = useWatch({ name: "conditions" }) as
    | EstimateLineEditorFormValues["conditions"]
    | undefined;
  const selected = (useWatch({ name: phasesPath }) ??
    []) as EstimateConditionLaborPhaseFormRow[];
  const laborPhasesExplicit = useWatch({ name: explicitPath }) as boolean | undefined;
  // Roots always own their phases control; children use the explicit flag as inherit checkbox.
  const hasOverride = isChild ? laborPhasesExplicit === true : true;

  const selectedIds = useMemo(
    () => selected.map((row) => row.labor_phase_id),
    [selected],
  );

  const { data: laborPhases, isLoading } = useSurfaceList("labor_phase_table");
  const options = useMemo(
    () =>
      (laborPhases?.data.rows ?? []).map((row) => ({
        value: String(row.id),
        label: unwrapCatalogName(row as Record<string, unknown>),
      })),
    [laborPhases?.data.rows],
  );

  const resolvedPhases = resolveEffectiveLaborPhases(
    conditions ?? [],
    binding.conditionPath,
  );
  const displayIds = hasOverride
    ? selectedIds
    : (resolvedPhases ?? []).map((phase) => phase.labor_phase_id);

  const updatePhases = (nextIds: string[], shouldDirty = true) => {
    const next = nextIds.map((laborPhaseId, index) => {
      const label = options.find((option) => option.value === laborPhaseId)?.label ?? "";
      return {
        labor_phase_id: laborPhaseId,
        labor_phase_name: label,
        sort_order: index + 1,
      };
    });

    setValue(phasesPath, next, { shouldDirty });
  };

  const editable = writable && hasOverride;

  return (
    <Controller
      control={control}
      name={phasesPath}
      render={() => (
        <FormFieldItem
          label="Labor Phases"
          controlPrefix={
            isChild ? (
              <Checkbox
                checked={hasOverride}
                disabled={disabled || !writable}
                onChange={(event) => {
                  if (event.target.checked) {
                    setValue(explicitPath, true, { shouldDirty: true });
                    // Seed from resolved ancestry (or empty if none).
                    updatePhases(
                      (resolvedPhases ?? []).map((phase) => phase.labor_phase_id),
                    );
                  } else {
                    setValue(explicitPath, false, { shouldDirty: true });
                    setValue(phasesPath, [], { shouldDirty: true });
                  }
                }}
              />
            ) : undefined
          }
        >
          <Select
            mode="multiple"
            allowClear={editable}
            style={{ width: "100%" }}
            placeholder={
              isLoading
                ? "Loading phases…"
                : displayIds.length === 0
                  ? resolvedPhases === null && !hasOverride
                    ? "Catalog default"
                    : "No phases"
                  : undefined
            }
            loading={isLoading}
            disabled={disabled || !editable}
            options={options}
            value={displayIds}
            onChange={(nextIds) => {
              if (!editable) return;
              setValue(explicitPath, true, { shouldDirty: true });
              updatePhases(nextIds);
            }}
          />
        </FormFieldItem>
      )}
    />
  );
};
