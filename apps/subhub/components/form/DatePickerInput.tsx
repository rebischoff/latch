"use client";

import { type FieldId } from "@latch/contracts";
import { DatePicker, Skeleton, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type DatePickerInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  loading?: boolean;
};

const toDayjs = (value: string | null | undefined): Dayjs | null =>
  value ? dayjs(value) : null;

const fromDayjs = (value: Dayjs | null): string | null =>
  value ? value.format("YYYY-MM-DD") : null;

export const DatePickerInput = <T extends FieldValues>({
  field,
  name,
  label,
  loading: loadingOverride,
}: DatePickerInputProps<T>) => {
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
        const readLabel = rhfField.value
          ? dayjs(rhfField.value as string).format("YYYY-MM-DD")
          : "—";

        return (
          <FormFieldItem label={label} error={fieldState.error?.message}>
            {loading ? (
              <Skeleton.Input active block />
            ) : mode === "write" ? (
              <DatePicker
                value={toDayjs(rhfField.value as string | null)}
                disabled={disabled}
                onChange={(value) => rhfField.onChange(fromDayjs(value))}
                style={{ width: "100%" }}
                status={fieldState.error ? "error" : undefined}
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
