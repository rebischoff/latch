"use client";

import { type FieldId } from "@latch/contracts";
import { Checkbox, Skeleton, Typography } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type CheckboxInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  checkboxLabel?: string;
  loading?: boolean;
};

export const CheckboxInput = <T extends FieldValues>({
  field,
  name,
  label,
  checkboxLabel,
  loading: loadingOverride,
}: CheckboxInputProps<T>) => {
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
            <Skeleton.Button active size="small" />
          ) : mode === "write" ? (
            <Checkbox
              checked={Boolean(rhfField.value)}
              disabled={disabled}
              onChange={(event) => rhfField.onChange(event.target.checked)}
            >
              {checkboxLabel}
            </Checkbox>
          ) : (
            <Typography.Text>
              {rhfField.value ? "Yes" : "No"}
            </Typography.Text>
          )}
        </FormFieldItem>
      )}
    />
  );
};
