"use client";

import { type FieldId } from "@latch/contracts";
import { Progress, Skeleton, Slider, Typography } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type SliderInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  loading?: boolean;
  min?: number;
  max?: number;
};

export const SliderInput = <T extends FieldValues>({
  field,
  name,
  label,
  loading: loadingOverride,
  min = 0,
  max = 100,
}: SliderInputProps<T>) => {
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
            <Slider
              min={min}
              max={max}
              value={typeof rhfField.value === "number" ? rhfField.value : min}
              disabled={disabled}
              onChange={rhfField.onChange}
            />
          ) : (
            <div>
              <Typography.Text style={{ display: "block", marginBottom: 8 }}>
                {typeof rhfField.value === "number" ? rhfField.value : "—"}
              </Typography.Text>
              <Progress
                percent={typeof rhfField.value === "number" ? rhfField.value : 0}
                showInfo={false}
                size="small"
              />
            </div>
          )}
        </FormFieldItem>
      )}
    />
  );
};
