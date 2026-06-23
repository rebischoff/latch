"use client";

import { type FieldId } from "@latch/contracts";
import { AutoComplete, Skeleton, Typography } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type AutoCompleteOption = {
  value: string;
};

type AutoCompleteInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  options: AutoCompleteOption[];
  loading?: boolean;
};

export const AutoCompleteInput = <T extends FieldValues>({
  field,
  name,
  label,
  options,
  loading: loadingOverride,
}: AutoCompleteInputProps<T>) => {
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
            <AutoComplete
              options={options}
              value={rhfField.value ?? ""}
              disabled={disabled}
              onChange={rhfField.onChange}
              onBlur={rhfField.onBlur}
              style={{ width: "100%" }}
              status={fieldState.error ? "error" : undefined}
            />
          ) : (
            <Typography.Text>{rhfField.value || "—"}</Typography.Text>
          )}
        </FormFieldItem>
      )}
    />
  );
};
