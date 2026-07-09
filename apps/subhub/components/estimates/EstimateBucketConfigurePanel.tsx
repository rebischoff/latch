"use client";

import { Typography } from "antd";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { EstimateScopeLaborPhaseFields } from "@/components/estimates/EstimateScopeLaborPhaseFields";
import { EstimateScopeSpecFields } from "@/components/estimates/EstimateScopeSpecFields";
import type { EstimateLineEditorFormValues } from "@/components/estimates/estimate-line-tree";
import type {
  EstimateBucketBinding,
  EstimateBucketSelection,
} from "@/components/estimates/estimate-line-selection";
import { resolveBucketBinding } from "@/components/estimates/estimate-line-selection";
import { LinkedSelectControl } from "@/components/form/LinkedSelectInput";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";

type EstimateBucketConfigurePanelProps = {
  disabled: boolean;
  selection: EstimateBucketSelection | null;
  writable: boolean;
  ensureIncluded: () => EstimateBucketBinding | null;
};

const unwrapCatalogName = (row: Record<string, unknown>): string => {
  const nameField = row.name as { name?: string } | undefined;
  return nameField?.name ?? "";
};

const complexityPath = (binding: EstimateBucketBinding) =>
  binding.zoneIndex === undefined
    ? (`scopes.${binding.scopeIndex}.complexity_factor_id` as const)
    : (`scopes.${binding.scopeIndex}.zones.${binding.zoneIndex}.complexity_factor_id` as const);

type ComplexityFieldProps = {
  binding: EstimateBucketBinding | null;
  complexityLoading: boolean;
  complexityOptions: Array<{ value: string; label: string }>;
  disabled: boolean;
  onChange: (next: string) => void;
  writable: boolean;
};

const ComplexityField = ({
  binding,
  complexityLoading,
  complexityOptions,
  disabled,
  onChange,
  writable,
}: ComplexityFieldProps) => {
  const complexityValue = useWatch({
    name: binding ? complexityPath(binding) : "scopes.0.complexity_factor_id",
  }) as string | null | undefined;

  return (
    <div style={{ marginBottom: 16 }}>
      <Typography.Text style={{ display: "block", marginBottom: 4 }}>
        Complexity factor
      </Typography.Text>
      <LinkedSelectControl
        mode={writable ? "write" : "read"}
        value={binding ? (complexityValue ?? null) : null}
        options={complexityOptions}
        loading={complexityLoading}
        disabled={disabled || !writable}
        selectProps={{ allowClear: true }}
        onChange={onChange}
      />
    </div>
  );
};

export const EstimateBucketConfigurePanel = ({
  disabled,
  selection,
  writable,
  ensureIncluded,
}: EstimateBucketConfigurePanelProps) => {
  const { setValue } = useFormContext<EstimateLineEditorFormValues>();
  const scopes = useWatch({ name: "scopes" }) as EstimateLineEditorFormValues["scopes"] | undefined;

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

  const binding = selection ? resolveBucketBinding(scopes ?? [], selection) : null;

  if (!selection) {
    return (
      <div>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
          Bucket configuration
        </Typography.Text>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Select a scope or zone to configure filters and phases.
        </Typography.Paragraph>
      </div>
    );
  }

  const isZone = selection.siteZoneId !== null;

  const handleComplexityChange = (next: string) => {
    const resolved = ensureIncluded();
    if (!resolved) {
      return;
    }

    setValue(complexityPath(resolved), next || null, { shouldDirty: true });
  };

  return (
    <div>
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        {isZone ? "Zone configuration" : "Scope configuration"}
      </Typography.Text>

      <ComplexityField
        binding={binding}
        complexityLoading={complexityLoading}
        complexityOptions={complexityOptions}
        disabled={disabled}
        onChange={handleComplexityChange}
        writable={writable}
      />

      <EstimateScopeLaborPhaseFields
        scopeIndex={binding?.scopeIndex ?? -1}
        zoneIndex={binding?.zoneIndex}
        writable={writable}
        disabled={disabled}
        ensureIncluded={ensureIncluded}
      />
      {binding ? (
        <EstimateScopeSpecFields
          scopeIndex={binding.scopeIndex}
          zoneIndex={binding.zoneIndex}
          writable={writable}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
};
