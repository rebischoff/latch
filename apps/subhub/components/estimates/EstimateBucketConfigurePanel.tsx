"use client";

import { Checkbox, Input, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { EstimateScopeLaborPhaseFields } from "@/components/estimates/EstimateScopeLaborPhaseFields";
import { EstimateScopeSpecFields } from "@/components/estimates/EstimateScopeSpecFields";
import {
  bindingIsChild,
  conditionPathToRhf,
} from "@/components/estimates/estimate-bucket-paths";
import type { EstimateLineEditorFormValues } from "@/components/estimates/estimate-line-tree";
import type {
  EstimateBucketBinding,
  EstimateBucketSelection,
} from "@/components/estimates/estimate-line-selection";
import { resolveBucketBinding } from "@/components/estimates/estimate-line-selection";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import { LinkedSelectControl } from "@/components/form/LinkedSelectInput";
import { resolveEffectiveComplexityFactorId } from "@/lib/estimates/estimate-bucket-specs-form";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";

type EstimateBucketConfigurePanelProps = {
  disabled: boolean;
  selection: EstimateBucketSelection | null;
  writable: boolean;
};

const unwrapCatalogName = (row: Record<string, unknown>): string => {
  const nameField = row.name as { name?: string } | undefined;
  return nameField?.name ?? "";
};

export const EstimateBucketConfigurePanel = ({
  disabled,
  selection,
  writable,
}: EstimateBucketConfigurePanelProps) => {
  const { control, setValue } = useFormContext<EstimateLineEditorFormValues>();
  const conditions = useWatch({ name: "conditions" }) as
    | EstimateLineEditorFormValues["conditions"]
    | undefined;

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

  const binding = selection ? resolveBucketBinding(conditions ?? [], selection) : null;
  const isChild = binding ? bindingIsChild(binding) : false;

  if (!selection) {
    return (
      <div>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
          Configuration
        </Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Select a condition to configure name, complexity, phases, and specs.
        </Typography.Paragraph>
      </div>
    );
  }

  if (!binding) {
    return (
      <div>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
          Configuration
        </Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Selection is not on the quote tree yet.
        </Typography.Paragraph>
      </div>
    );
  }

  const namePath = conditionPathToRhf(binding.conditionPath, "name");
  const complexityPath = conditionPathToRhf(
    binding.conditionPath,
    "complexity_factor_id",
  );

  return (
    <div>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        Configuration
      </Typography.Text>

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

      <ComplexityField
        binding={binding}
        complexityLoading={complexityLoading}
        complexityOptions={complexityOptions}
        complexityPath={complexityPath}
        disabled={disabled}
        isChild={isChild}
        writable={writable}
      />

      <EstimateScopeLaborPhaseFields
        binding={binding}
        isChild={isChild}
        writable={writable}
        disabled={disabled}
      />
      <EstimateScopeSpecFields
        binding={binding}
        isChild={isChild}
        writable={writable}
        disabled={disabled}
      />
    </div>
  );
};

type ComplexityFieldProps = {
  binding: EstimateBucketBinding;
  complexityLoading: boolean;
  complexityOptions: Array<{ value: string; label: string }>;
  complexityPath: ReturnType<typeof conditionPathToRhf>;
  disabled: boolean;
  isChild: boolean;
  writable: boolean;
};

const ComplexityField = ({
  binding,
  complexityLoading,
  complexityOptions,
  complexityPath,
  disabled,
  isChild,
  writable,
}: ComplexityFieldProps) => {
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();
  const conditions = useWatch({ name: "conditions" }) as
    | EstimateLineEditorFormValues["conditions"]
    | undefined;
  const ownValue = useWatch({ name: complexityPath }) as string | null | undefined;
  const hasStoredOverride = ownValue != null && ownValue !== "";
  // Session override intent — needed when ancestry is null (seeding null cannot flip hasOverride).
  const [forceOverride, setForceOverride] = useState(false);
  const pathKey = binding.conditionPath.join(".");
  useEffect(() => {
    setForceOverride(false);
  }, [pathKey]);
  const hasOverride = !isChild || hasStoredOverride || forceOverride;
  const resolved = resolveEffectiveComplexityFactorId(
    conditions ?? [],
    binding.conditionPath,
  );
  const displayValue = hasStoredOverride ? ownValue : resolved;
  const editable = writable && hasOverride;

  return (
    <FormFieldItem
      label="Complexity factor"
      controlPrefix={
        isChild ? (
          <Checkbox
            checked={hasOverride}
            disabled={disabled || !writable}
            onChange={(event) => {
              if (event.target.checked) {
                setForceOverride(true);
                if (resolved) {
                  setValue(complexityPath, resolved, { shouldDirty: true });
                }
              } else {
                setForceOverride(false);
                setValue(complexityPath, null, { shouldDirty: true });
              }
            }}
          />
        ) : undefined
      }
    >
      <LinkedSelectControl
        mode="write"
        value={displayValue ?? null}
        options={complexityOptions}
        loading={complexityLoading}
        disabled={disabled || !editable}
        selectProps={{ allowClear: editable }}
        onChange={(next) => {
          if (!editable) return;
          setValue(complexityPath, next || null, { shouldDirty: true });
        }}
      />
    </FormFieldItem>
  );
};
