"use client";

import { type FieldId } from "@latch/contracts";
import { Skeleton, TreeSelect, Typography } from "antd";
import type { TreeSelectProps } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { findTreeTitle } from "./optionHelpers";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type TreeSelectInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  treeData: TreeSelectProps["treeData"];
  loading?: boolean;
};

export const TreeSelectInput = <T extends FieldValues>({
  field,
  name,
  label,
  treeData,
  loading: loadingOverride,
}: TreeSelectInputProps<T>) => {
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
            <TreeSelect
              treeData={treeData}
              value={rhfField.value ?? undefined}
              disabled={disabled}
              onChange={rhfField.onChange}
              onBlur={rhfField.onBlur}
              style={{ width: "100%" }}
              status={fieldState.error ? "error" : undefined}
            />
          ) : (
            <Typography.Text>
              {findTreeTitle(treeData, rhfField.value as string | null)}
            </Typography.Text>
          )}
        </FormFieldItem>
      )}
    />
  );
};
