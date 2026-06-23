"use client";

import { type FieldId } from "@latch/contracts";
import { Input, Skeleton } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type TextAreaInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  loading?: boolean;
  rows?: number;
};

export const TextAreaInput = <T extends FieldValues>({
  field,
  name,
  label,
  loading: loadingOverride,
  rows = 4,
}: TextAreaInputProps<T>) => {
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
        <FormFieldItem label={label} error={fieldState.error?.message} controlWidth="full">
          {loading ? (
            <Skeleton.Input active block style={{ height: rows * 22 }} />
          ) : mode === "write" ? (
            <Input.TextArea
              {...rhfField}
              value={rhfField.value ?? ""}
              rows={rows}
              disabled={disabled}
              status={fieldState.error ? "error" : undefined}
            />
          ) : (
            <Input.TextArea
              {...rhfField}
              value={rhfField.value ?? ""}
              rows={rows}
              readOnly
              variant="borderless"
            />
          )}
        </FormFieldItem>
      )}
    />
  );
};
