"use client";

import { type FieldId } from "@latch/contracts";
import { Radio, Skeleton, Typography } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type RadioOption = {
  value: string;
  label: string;
};

type RadioInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  options: RadioOption[];
  loading?: boolean;
};

export const RadioInput = <T extends FieldValues>({
  field,
  name,
  label,
  options,
  loading: loadingOverride,
}: RadioInputProps<T>) => {
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
      render={({ field: rhfField, fieldState }) => {
        const readLabel =
          options.find((option) => option.value === rhfField.value)?.label ?? "—";

        return (
          <FormFieldItem label={label} error={fieldState.error?.message}>
            {loading ? (
              <Skeleton.Input active block />
            ) : mode === "write" ? (
              <Radio.Group
                options={options}
                value={rhfField.value}
                disabled={disabled}
                onChange={(event) => rhfField.onChange(event.target.value)}
              />
            ) : (
              <Typography.Text>{readLabel}</Typography.Text>
            )}
          </FormFieldItem>
        );
      }}
    />
  );
};
