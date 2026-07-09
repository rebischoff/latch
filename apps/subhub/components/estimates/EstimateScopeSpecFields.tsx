"use client";

import { InputNumber, Select, Switch, Typography } from "antd";
import { Controller, useWatch, type FieldPath } from "react-hook-form";

import {
  type EstimateLineEditorFormValues,
  type EstimateScopeSpecFormRow,
} from "@/components/estimates/estimate-line-tree";

type EstimateScopeSpecFieldsProps = {
  disabled: boolean;
  scopeIndex: number;
  writable: boolean;
  zoneIndex?: number;
};

const specFieldPath = (
  scopeIndex: number,
  specIndex: number,
  key: keyof EstimateScopeSpecFormRow,
  zoneIndex?: number,
): FieldPath<EstimateLineEditorFormValues> => {
  if (zoneIndex !== undefined) {
    return `scopes.${scopeIndex}.zones.${zoneIndex}.specs.${specIndex}.${key}` as FieldPath<EstimateLineEditorFormValues>;
  }

  return `scopes.${scopeIndex}.specs.${specIndex}.${key}` as FieldPath<EstimateLineEditorFormValues>;
};

const formatDisplayNumber = (
  value: number | null | undefined,
  spec: EstimateScopeSpecFormRow,
): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  const formatted =
    spec.decimal_places != null ? value.toFixed(spec.decimal_places) : String(value);

  return spec.unit_symbol ? `${formatted} ${spec.unit_symbol}` : formatted;
};

type SpecControlProps = {
  disabled: boolean;
  scopeIndex: number;
  spec: EstimateScopeSpecFormRow;
  specIndex: number;
  writable: boolean;
  zoneIndex?: number;
};

const SpecControl = ({
  disabled,
  scopeIndex,
  spec,
  specIndex,
  writable,
  zoneIndex,
}: SpecControlProps) => {
  const label = spec.def_display_name ?? "Spec";
  const valueType = spec.value_type ?? "enum";

  if (valueType === "enum") {
    const options = (spec.options ?? []).map((option) => ({
      value: option.id,
      label: option.display_name,
    }));

    return (
      <Controller<EstimateLineEditorFormValues>
        name={specFieldPath(scopeIndex, specIndex, "spec_option_id", zoneIndex)}
        render={({ field: { value, onChange } }) =>
          writable ? (
            <div>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                {label}
              </Typography.Text>
              <Select
                allowClear
                size="small"
                style={{ width: "100%" }}
                placeholder="Select…"
                options={options}
                value={typeof value === "string" ? value : null}
                disabled={disabled}
                onChange={(next) => onChange(next ?? null)}
              />
            </div>
          ) : (
            <div>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                {label}
              </Typography.Text>
              <Typography.Text>
                {spec.option_display_name ??
                  options.find((option) => option.value === value)?.label ??
                  "—"}
              </Typography.Text>
            </div>
          )
        }
      />
    );
  }

  if (valueType === "boolean") {
    return (
      <Controller<EstimateLineEditorFormValues>
        name={specFieldPath(scopeIndex, specIndex, "value_boolean", zoneIndex)}
        render={({ field: { value, onChange } }) =>
          writable ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Typography.Text type="secondary">{label}</Typography.Text>
              <Switch
                size="small"
                checked={value === true}
                disabled={disabled}
                onChange={(checked) => onChange(checked)}
              />
            </div>
          ) : (
            <div>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                {label}
              </Typography.Text>
              <Typography.Text>{value === true ? "Yes" : value === false ? "No" : "—"}</Typography.Text>
            </div>
          )
        }
      />
    );
  }

  if (valueType === "number") {
    return (
      <Controller<EstimateLineEditorFormValues>
        name={specFieldPath(scopeIndex, specIndex, "value_number", zoneIndex)}
        render={({ field: { value, onChange } }) =>
          writable ? (
            <div>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                {label}
              </Typography.Text>
              <InputNumber
                addonAfter={spec.unit_symbol ?? undefined}
                disabled={disabled}
                placeholder="No filter"
                precision={spec.decimal_places ?? undefined}
                size="small"
                style={{ width: "100%" }}
                value={typeof value === "number" ? value : null}
                onChange={(next) => onChange(next ?? null)}
              />
            </div>
          ) : (
            <div>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                {label}
              </Typography.Text>
              <Typography.Text>{formatDisplayNumber(value as number | null, spec)}</Typography.Text>
            </div>
          )
        }
      />
    );
  }

  return (
    <div>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </Typography.Text>
      <Typography.Text>—</Typography.Text>
    </div>
  );
};

export const EstimateScopeSpecFields = ({
  disabled,
  scopeIndex,
  writable,
  zoneIndex,
}: EstimateScopeSpecFieldsProps) => {
  const specsPath =
    zoneIndex !== undefined
      ? (`scopes.${scopeIndex}.zones.${zoneIndex}.specs` as const)
      : (`scopes.${scopeIndex}.specs` as const);

  const specs = useWatch({
    name: specsPath,
  }) as EstimateScopeSpecFormRow[] | undefined;

  if (!specs?.length) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
        padding: "4px 0",
        width: "100%",
      }}
    >
      {specs.map((spec, specIndex) => (
        <SpecControl
          key={spec.spec_def_id}
          disabled={disabled}
          spec={spec}
          specIndex={specIndex}
          scopeIndex={scopeIndex}
          writable={writable}
          zoneIndex={zoneIndex}
        />
      ))}
    </div>
  );
};
