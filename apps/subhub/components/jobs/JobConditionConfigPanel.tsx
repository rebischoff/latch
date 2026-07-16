"use client";

import { Input, Typography } from "antd";
import { useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { ComplexityField } from "@/components/estimates/EstimateBucketConfigurePanel";
import { EstimateConditionBooleanY4Fields } from "@/components/estimates/EstimateConditionBooleanY4Fields";
import { EstimateScopeLaborPhaseFields } from "@/components/estimates/EstimateScopeLaborPhaseFields";
import { EstimateScopeSpecFields } from "@/components/estimates/EstimateScopeSpecFields";
import { conditionPathToRhf as estimateConditionPathToRhf } from "@/components/estimates/estimate-bucket-paths";
import type { EstimateBucketBinding } from "@/components/estimates/estimate-line-selection";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import {
  findJobConditionPath,
  isComplexityAdjustedFromSold,
  jobConditionPathToRhf,
  resolveJobEffectiveComplexityFactorId,
  type JobConditionFormRow,
  type JobScopeFormValues,
} from "@/components/jobs/job-scope-tree";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";

type JobConditionConfigPanelProps = {
  conditions: JobConditionFormRow[];
  disabled: boolean;
  selectedConditionId: string | null;
  writable: boolean;
};

const unwrapCatalogName = (row: Record<string, unknown>): string => {
  const nameField = row.name as { name?: string } | undefined;
  return nameField?.name ?? "";
};

/**
 * Editable Config panel for the selected job condition (task 46 Scope-U1/W3
 * problem 1). Reuses the estimate condition knob components (Scope-S1) —
 * they only depend on `binding.conditionPath` + ambient RHF form context,
 * so they work unmodified against the job Scope form's `conditions` tree.
 */
export const JobConditionConfigPanel = ({
  conditions,
  disabled,
  selectedConditionId,
  writable,
}: JobConditionConfigPanelProps) => {
  const { control, setValue } = useFormContext<JobScopeFormValues>();
  const watchedConditions =
    (useWatch({ control, name: "conditions" }) as JobConditionFormRow[] | undefined) ??
    conditions;

  const { data: complexityFactors, isLoading: complexityLoading } =
    useSurfaceList("complexity_factor_table");
  const complexityOptions = useMemo(
    () =>
      (complexityFactors?.data.rows ?? []).map((row) => ({
        value: String(row.id),
        label: unwrapCatalogName(row as Record<string, unknown>),
      })),
    [complexityFactors?.data.rows],
  );

  if (!selectedConditionId) {
    return (
      <Typography.Paragraph type="secondary">
        Select a condition to view its configuration.
      </Typography.Paragraph>
    );
  }

  const conditionPath = findJobConditionPath(watchedConditions, selectedConditionId);
  let selectedCondition: JobConditionFormRow | null = null;
  if (conditionPath) {
    let node: JobConditionFormRow | undefined = watchedConditions[conditionPath[0]!];
    for (let i = 1; i < conditionPath.length; i += 1) {
      node = node?.conditions[conditionPath[i]!];
    }
    selectedCondition = node ?? null;
  }

  if (!conditionPath) {
    return (
      <Typography.Paragraph type="secondary">
        Selection is not on the condition tree yet.
      </Typography.Paragraph>
    );
  }

  const binding: EstimateBucketBinding = { conditionPath };
  const isChild = conditionPath.length > 1;
  const namePath = jobConditionPathToRhf(conditionPath, "name");
  const complexityPath = estimateConditionPathToRhf(conditionPath, "complexity_factor_id");
  const effectiveComplexity = resolveJobEffectiveComplexityFactorId(
    watchedConditions,
    conditionPath,
  );
  const showComplexityDrift = isComplexityAdjustedFromSold(
    selectedCondition?.complexity_factor_id_at_win,
    effectiveComplexity,
  );

  return (
    <div>
      <Controller
        control={control}
        name={namePath}
        render={({ field }) => (
          <FormFieldItem label="Name">
            <Input
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
              disabled={disabled || !writable}
              onChange={(event) => {
                field.onChange(event.target.value);
                setValue(namePath, event.target.value, { shouldDirty: true });
              }}
            />
          </FormFieldItem>
        )}
      />

      <FormFieldItem label="Site zone">
        <Typography.Text type={selectedCondition?.site_zone_name ? undefined : "secondary"}>
          {selectedCondition?.site_zone_name ?? "—"}
        </Typography.Text>
      </FormFieldItem>

      <ComplexityField
        binding={binding}
        complexityLoading={complexityLoading}
        complexityOptions={complexityOptions}
        complexityPath={complexityPath}
        disabled={disabled}
        isChild={isChild}
        writable={writable}
      />
      {showComplexityDrift ? (
        <Typography.Paragraph type="warning" style={{ marginTop: -8, marginBottom: 16 }}>
          Adjusted from sold
        </Typography.Paragraph>
      ) : null}

      <EstimateScopeLaborPhaseFields
        binding={binding}
        disabled={disabled}
        isChild={isChild}
        writable={writable}
      />

      <EstimateConditionBooleanY4Fields
        binding={binding}
        disabled={disabled}
        isChild={isChild}
        writable={writable}
      />

      <EstimateScopeSpecFields
        binding={binding}
        disabled={disabled}
        isChild={isChild}
        writable={writable}
      />
    </div>
  );
};
