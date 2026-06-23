"use client";

import { type FieldId } from "@latch/contracts";
import { Select, Skeleton, Typography } from "antd";
import type { SelectProps } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { findSelectLabel } from "./optionHelpers";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type SelectInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  options: SelectProps["options"];
  loading?: boolean;
  selectProps?: Omit<SelectProps, "options" | "value" | "onChange" | "mode">;
};

export const SelectInput = <T extends FieldValues>({
  field,
  name,
  label,
  options,
  loading: loadingOverride,
  selectProps,
}: SelectInputProps<T>) => {
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
            <Select
              {...selectProps}
              options={options}
              value={rhfField.value ?? undefined}
              onChange={rhfField.onChange}
              onBlur={rhfField.onBlur}
              disabled={disabled}
              style={{ width: "100%", ...selectProps?.style }}
              status={fieldState.error ? "error" : undefined}
            />
          ) : (
            <Typography.Text>
              {findSelectLabel(options, rhfField.value as string | null)}
            </Typography.Text>
          )}
        </FormFieldItem>
      )}
    />
  );
};
