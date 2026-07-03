"use client";

import { Input, Select, Switch, Typography } from "antd";
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
  const valueType = spec.value_type ?? "text";

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

  return (
    <Controller<EstimateLineEditorFormValues>
      name={specFieldPath(scopeIndex, specIndex, "value_text", zoneIndex)}
      render={({ field: { value, onChange, onBlur } }) =>
        writable ? (
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              {label}
            </Typography.Text>
            <Input
              size="small"
              value={typeof value === "string" ? value : ""}
              disabled={disabled}
              onChange={onChange}
              onBlur={onBlur}
            />
          </div>
        ) : (
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              {label}
            </Typography.Text>
            <Typography.Text>{typeof value === "string" && value ? value : "—"}</Typography.Text>
          </div>
        )
      }
    />
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
