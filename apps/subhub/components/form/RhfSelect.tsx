"use client";

import { Select, Typography } from "antd";
import type { SelectProps } from "antd";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

type RhfSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  readOnly?: boolean;
  options: SelectProps["options"];
  selectProps?: Omit<SelectProps, "options" | "value" | "onChange" | "mode">;
  mode?: SelectProps["mode"];
};

export const RhfSelect = <T extends FieldValues>({
  control,
  name,
  label,
  readOnly = false,
  options,
  selectProps,
  mode,
}: RhfSelectProps<T>) => {
  if (readOnly) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const values = Array.isArray(field.value) ? field.value : [field.value];
          const labels = values
            .map((value) => options?.find((option) => option.value === value)?.label)
            .filter(Boolean);

          return (
            <div>
              <Typography.Text type="secondary">{label}</Typography.Text>
              <div>
                <Typography.Text>
                  {labels.length > 0 ? labels.join(", ") : "—"}
                </Typography.Text>
              </div>
            </div>
          );
        }}
      />
    );
  }

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div>
          <Typography.Text type="secondary">{label}</Typography.Text>
          <Select
            {...selectProps}
            mode={mode}
            options={options}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            style={{ width: "100%", ...selectProps?.style }}
            status={fieldState.error ? "error" : undefined}
          />
          {fieldState.error ? (
            <Typography.Text type="danger">{fieldState.error.message}</Typography.Text>
          ) : null}
        </div>
      )}
    />
  );
};
