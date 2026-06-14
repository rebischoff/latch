"use client";

import { Input, Typography } from "antd";
import type { PasswordProps } from "antd/es/input";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

type RhfPasswordProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  inputProps?: PasswordProps;
};

export const RhfPassword = <T extends FieldValues>({
  control,
  name,
  label,
  inputProps,
}: RhfPasswordProps<T>) => (
  <Controller
    control={control}
    name={name}
    render={({ field, fieldState }) => (
      <div>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <Input.Password
          {...field}
          {...inputProps}
          value={field.value ?? ""}
          status={fieldState.error ? "error" : undefined}
        />
        {fieldState.error ? (
          <Typography.Text type="danger">{fieldState.error.message}</Typography.Text>
        ) : null}
      </div>
    )}
  />
);
