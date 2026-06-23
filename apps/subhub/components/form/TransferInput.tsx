"use client";

import { type FieldId } from "@latch/contracts";
import { Skeleton, Transfer, Typography } from "antd";
import type { TransferProps } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type TransferInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  dataSource: TransferProps["dataSource"];
  loading?: boolean;
};

export const TransferInput = <T extends FieldValues>({
  field,
  name,
  label,
  dataSource,
  loading: loadingOverride,
}: TransferInputProps<T>) => {
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
        const selectedKeys = Array.isArray(rhfField.value) ? rhfField.value : [];
        const selectedTitles = selectedKeys
          .map((key) => dataSource?.find((item) => item.key === key)?.title)
          .filter(Boolean);

        return (
          <FormFieldItem label={label} error={fieldState.error?.message} controlWidth="full">
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : mode === "write" ? (
              <Transfer
                dataSource={dataSource}
                targetKeys={selectedKeys}
                disabled={disabled}
                render={(item) => item.title ?? String(item.key)}
                onChange={(nextKeys) => rhfField.onChange(nextKeys)}
                listStyle={{ width: "100%", height: 180 }}
              />
            ) : selectedTitles.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {selectedTitles.map((title) => (
                  <li key={String(title)}>
                    <Typography.Text>{title}</Typography.Text>
                  </li>
                ))}
              </ul>
            ) : (
              <Typography.Text>—</Typography.Text>
            )}
          </FormFieldItem>
        );
      }}
    />
  );
};
