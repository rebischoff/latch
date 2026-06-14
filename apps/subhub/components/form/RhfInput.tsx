"use client";

import { Input, Typography } from "antd";
import type { InputProps } from "antd";
import type { ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

type RhfInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  readOnly?: boolean;
  inputProps?: InputProps;
};

export const RhfInput = <T extends FieldValues>({
  control,
  name,
  label,
  readOnly = false,
  inputProps,
}: RhfInputProps<T>) => {
  if (readOnly) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div>
            <Typography.Text type="secondary">{label}</Typography.Text>
            <div>
              <Typography.Text>{String(field.value ?? "—")}</Typography.Text>
            </div>
          </div>
        )}
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
          <Input
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
};

type ReadOnlyValueProps = {
  label: string;
  value: ReactNode;
};

export const ReadOnlyValue = ({ label, value }: ReadOnlyValueProps) => (
  <div>
    <Typography.Text type="secondary">{label}</Typography.Text>
    <div>
      <Typography.Text>{value ?? "—"}</Typography.Text>
    </div>
  </div>
);
