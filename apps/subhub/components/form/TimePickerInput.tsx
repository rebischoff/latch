"use client";

import { type FieldId } from "@latch/contracts";
import { Skeleton, TimePicker, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type TimePickerInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  loading?: boolean;
};

const toDayjs = (value: string | null | undefined): Dayjs | null => {
  if (!value) {
    return null;
  }
  return dayjs(`1970-01-01T${value}`);
};

const fromDayjs = (value: Dayjs | null): string | null =>
  value ? value.format("HH:mm:ss") : null;

export const TimePickerInput = <T extends FieldValues>({
  field,
  name,
  label,
  loading: loadingOverride,
}: TimePickerInputProps<T>) => {
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
          ? dayjs(`1970-01-01T${rhfField.value as string}`).format("HH:mm")
          : "—";

        return (
          <FormFieldItem label={label} error={fieldState.error?.message}>
            {loading ? (
              <Skeleton.Input active block />
            ) : mode === "write" ? (
              <TimePicker
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
