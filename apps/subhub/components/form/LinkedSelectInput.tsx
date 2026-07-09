"use client";

import { ExportOutlined } from "@ant-design/icons";
import { type FieldId } from "@latch/contracts";
import { Button, Select, Skeleton, Space, Typography } from "antd";
import type { ReactNode } from "react";
import type { DefaultOptionType, SelectProps } from "antd/es/select";
import {
  Controller,
  useFormContext,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { findSelectLabel } from "./optionHelpers";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";
import { useConfirmDirtyNavigate } from "@/lib/hooks/use-confirm-dirty-navigate";

export const PICKER_ADD_NEW_VALUE = "__picker_add_new__";

type LinkedSelectControlProps = {
  value?: string | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options: SelectProps["options"];
  loading?: boolean;
  disabled?: boolean;
  status?: "error" | "warning";
  placeholder?: string;
  canLink?: boolean;
  linkHref?: (id: string) => string;
  canAddNew?: boolean;
  addNewHref?: string;
  addNewLabel?: string;
  selectProps?: Omit<SelectProps, "options" | "value" | "onChange" | "mode">;
  mode?: "write" | "read";
  suffix?: ReactNode;
};

const controlRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
} as const;

const buildDisplayOptions = (
  options: SelectProps["options"],
  canAddNew: boolean,
  addNewLabel: string,
): SelectProps["options"] => {
  if (!canAddNew) {
    return options;
  }

  return [
    ...(options ?? []),
    {
      value: PICKER_ADD_NEW_VALUE,
      label: `… ${addNewLabel}`,
    },
  ];
};

const filterLinkedOptions = (input: string, option?: DefaultOptionType) => {
  if (option?.value === PICKER_ADD_NEW_VALUE) {
    return true;
  }

  const label = typeof option?.label === "string" ? option.label : "";
  return label.toLowerCase().includes(input.toLowerCase());
};

export const LinkedSelectControl = ({
  value,
  onChange,
  onBlur,
  options,
  loading = false,
  disabled = false,
  status,
  placeholder,
  canLink = false,
  linkHref,
  canAddNew = false,
  addNewHref,
  addNewLabel = "Add",
  selectProps,
  mode = "write",
  suffix,
}: LinkedSelectControlProps) => {
  const confirmNavigate = useConfirmDirtyNavigate();
  const selectedId = value || undefined;
  const displayOptions = buildDisplayOptions(options, canAddNew, addNewLabel);
  const readLabel = findSelectLabel(options, value);

  const handleOpen = () => {
    if (!selectedId || !linkHref) {
      return;
    }
    confirmNavigate(linkHref(selectedId));
  };

  const handleChange = (nextValue: string) => {
    if (nextValue === PICKER_ADD_NEW_VALUE) {
      if (addNewHref) {
        confirmNavigate(addNewHref);
      }
      return;
    }

    onChange?.(nextValue);
  };

  if (loading) {
    return <Skeleton.Input active block />;
  }

  if (mode === "read") {
    if (canLink && selectedId) {
      return (
        <div style={controlRowStyle}>
          <Space.Compact block style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text style={{ flex: 1, lineHeight: "32px" }}>{readLabel}</Typography.Text>
            <Button
              aria-label="Open record"
              icon={<ExportOutlined />}
              onClick={handleOpen}
            />
          </Space.Compact>
          {suffix}
        </div>
      );
    }

    return (
      <div style={controlRowStyle}>
        <Typography.Text style={{ flex: 1, minWidth: 0 }}>{readLabel}</Typography.Text>
        {suffix}
      </div>
    );
  }

  const selectWidth = canLink ? "calc(100% - 32px)" : "100%";

  const control = (
    <Space.Compact block style={{ flex: 1, minWidth: 0 }}>
      <Select
        {...selectProps}
        showSearch={selectProps?.showSearch ?? true}
        optionFilterProp="label"
        filterOption={filterLinkedOptions}
        options={displayOptions}
        value={selectedId}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        loading={loading}
        placeholder={placeholder}
        status={status}
        style={{ width: selectWidth, ...selectProps?.style }}
      />
      {canLink ? (
        <Button
          aria-label="Open record"
          icon={<ExportOutlined />}
          disabled={!selectedId || disabled}
          onClick={handleOpen}
        />
      ) : null}
    </Space.Compact>
  );

  if (!suffix) {
    return control;
  }

  return (
    <div style={controlRowStyle}>
      {control}
      {suffix}
    </div>
  );
};

type LinkedSelectInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  options: SelectProps["options"];
  suffix?: ReactNode;
  loading?: boolean;
  selectProps?: Omit<SelectProps, "options" | "value" | "onChange" | "mode">;
  canLink?: boolean;
  linkHref?: (id: string) => string;
  canAddNew?: boolean;
  addNewHref?: string;
  addNewLabel?: string;
};

export const LinkedSelectInput = <T extends FieldValues>({
  field,
  name,
  label,
  options,
  suffix,
  loading: loadingOverride,
  selectProps,
  canLink,
  linkHref,
  canAddNew,
  addNewHref,
  addNewLabel,
}: LinkedSelectInputProps<T>) => {
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
          <LinkedSelectControl
            mode={mode === "write" ? "write" : "read"}
            options={options}
            value={rhfField.value as string | null}
            onChange={rhfField.onChange}
            onBlur={rhfField.onBlur}
            loading={loading}
            disabled={disabled}
            status={fieldState.error ? "error" : undefined}
            selectProps={selectProps}
            suffix={suffix}
            canLink={canLink}
            linkHref={linkHref}
            canAddNew={canAddNew}
            addNewHref={addNewHref}
            addNewLabel={addNewLabel}
          />
        </FormFieldItem>
      )}
    />
  );
};
