"use client";

import { type FieldId } from "@latch/contracts";
import { Input, Skeleton } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type TextInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  loading?: boolean;
};

export const TextInput = <T extends FieldValues>({
  field,
  name,
  label,
  loading: loadingOverride,
}: TextInputProps<T>) => {
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
            <Input
              {...rhfField}
              value={rhfField.value ?? ""}
              disabled={disabled}
              status={fieldState.error ? "error" : undefined}
            />
          ) : (
            <Input
              {...rhfField}
              value={rhfField.value ?? ""}
              readOnly
              variant="borderless"
            />
          )}
        </FormFieldItem>
      )}
    />
  );
};
