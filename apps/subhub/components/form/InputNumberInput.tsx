"use client";

import { type FieldId } from "@latch/contracts";
import { InputNumber, Skeleton, Typography } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type InputNumberInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  loading?: boolean;
  min?: number;
  max?: number;
};

export const InputNumberInput = <T extends FieldValues>({
  field,
  name,
  label,
  loading: loadingOverride,
  min,
  max,
}: InputNumberInputProps<T>) => {
  const mode = useFieldMode(field);
  const { control } = useFormContext<T>();
  const { loading: formLoading, disabled } = useFormUi();
  const loading = loadingOverride ?? formLoading;

  if (mode === "hidden") {
    return null;
  }

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: rhfField, fieldState }) => (
        <FormFieldItem label={label} error={fieldState.error?.message}>
          {loading ? (
            <Skeleton.Input active block />
          ) : mode === "write" ? (
            <InputNumber
              value={rhfField.value ?? null}
              onChange={rhfField.onChange}
              onBlur={rhfField.onBlur}
              disabled={disabled}
              min={min}
              max={max}
              style={{ width: "100%" }}
              status={fieldState.error ? "error" : undefined}
            />
          ) : (
            <Typography.Text>
              {rhfField.value ?? "—"}
            </Typography.Text>
          )}
        </FormFieldItem>
      )}
    />
  );
};
