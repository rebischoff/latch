"use client";

import { type FieldId } from "@latch/contracts";
import { Skeleton, Switch, Typography } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type SwitchInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  loading?: boolean;
};

export const SwitchInput = <T extends FieldValues>({
  field,
  name,
  label,
  loading: loadingOverride,
}: SwitchInputProps<T>) => {
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
            <Switch
              checked={Boolean(rhfField.value)}
              disabled={disabled}
              onChange={rhfField.onChange}
            />
          ) : (
            <Typography.Text>{rhfField.value ? "On" : "Off"}</Typography.Text>
          )}
        </FormFieldItem>
      )}
    />
  );
};
