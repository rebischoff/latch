"use client";

import { Select, Typography } from "antd";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";

import type {
  EstimateLineEditorFormValues,
  EstimateScopeLaborPhaseFormRow,
} from "@/components/estimates/estimate-line-tree";
import type { EstimateBucketBinding } from "@/components/estimates/estimate-line-selection";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";

type EstimateScopeLaborPhaseFieldsProps = {
  disabled: boolean;
  scopeIndex: number;
  writable: boolean;
  zoneIndex?: number;
  ensureIncluded?: () => EstimateBucketBinding | null;
};

const unwrapCatalogName = (row: Record<string, unknown>): string => {
  const nameField = row.name as { name?: string } | undefined;
  return nameField?.name ?? "";
};

export const EstimateScopeLaborPhaseFields = ({
  disabled,
  scopeIndex,
  writable,
  zoneIndex,
  ensureIncluded,
}: EstimateScopeLaborPhaseFieldsProps) => {
  const { control, setValue, watch } = useFormContext<EstimateLineEditorFormValues>();

  const fieldPath =
    scopeIndex >= 0
      ? zoneIndex === undefined
        ? (`scopes.${scopeIndex}.included_labor_phases` as const)
        : (`scopes.${scopeIndex}.zones.${zoneIndex}.included_labor_phases` as const)
      : ("scopes.0.included_labor_phases" as const);

  const selected =
    scopeIndex >= 0
      ? ((watch(fieldPath) ?? []) as EstimateScopeLaborPhaseFormRow[])
      : [];
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

  const updatePhases = (nextIds: string[]) => {
    const binding = ensureIncluded?.() ?? { scopeIndex, zoneIndex };
    if (!binding) {
      return;
    }

    const path =
      binding.zoneIndex === undefined
        ? (`scopes.${binding.scopeIndex}.included_labor_phases` as const)
        : (`scopes.${binding.scopeIndex}.zones.${binding.zoneIndex}.included_labor_phases` as const);

    const next = nextIds.map((laborPhaseId, index) => {
      const label = options.find((option) => option.value === laborPhaseId)?.label ?? "";
      return {
        labor_phase_id: laborPhaseId,
        labor_phase_name: label,
        sort_order: index + 1,
      };
    });

    setValue(path, next, { shouldDirty: true });
  };

  return (
    <Controller
      control={control}
      name={fieldPath}
      render={() => (
        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
            Included labor phases
          </Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Leave empty to include every phase from the item labor group.
          </Typography.Paragraph>
          <Select
            mode="multiple"
            allowClear
            style={{ width: "100%" }}
            placeholder={isLoading ? "Loading phases…" : "All phases (default)"}
            loading={isLoading}
            disabled={disabled || !writable}
            options={options}
            value={selectedIds}
            onChange={(nextIds) => updatePhases(nextIds)}
          />
        </div>
      )}
    />
  );
};
