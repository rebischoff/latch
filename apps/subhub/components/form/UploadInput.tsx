"use client";

import { type FieldId } from "@latch/contracts";
import { Skeleton, Typography, Upload } from "antd";
import type { UploadFile } from "antd";
import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { FormFieldItem } from "./FormFieldItem";
import { useFieldMode } from "@/components/surface/useFieldMode";
import { useFormUi } from "@/components/surface/useFormUi";

type UploadAttachment = {
  uid: string;
  name: string;
  url?: string;
};

type UploadInputProps<T extends FieldValues> = {
  field: FieldId;
  name: FieldPath<T>;
  label: string;
  loading?: boolean;
};

const toUploadFileList = (value: UploadAttachment[] | undefined): UploadFile[] =>
  (value ?? []).map((file) => ({
    uid: file.uid,
    name: file.name,
    url: file.url,
    status: "done" as const,
  }));

const fromUploadFileList = (fileList: UploadFile[]): UploadAttachment[] =>
  fileList.map((file) => ({
    uid: file.uid,
    name: file.name,
    url: file.url,
  }));

export const UploadInput = <T extends FieldValues>({
  field,
  name,
  label,
  loading: loadingOverride,
}: UploadInputProps<T>) => {
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
        const attachments = (rhfField.value as UploadAttachment[] | undefined) ?? [];

        return (
          <FormFieldItem label={label} error={fieldState.error?.message} controlWidth="full">
            {loading ? (
              <Skeleton.Input active block />
            ) : mode === "write" ? (
              <Upload
                fileList={toUploadFileList(attachments)}
                disabled={disabled}
                beforeUpload={() => false}
                onChange={({ fileList }) =>
                  rhfField.onChange(fromUploadFileList(fileList))
                }
              >
                <Typography.Link>Upload file</Typography.Link>
              </Upload>
            ) : attachments.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {attachments.map((file) => (
                  <li key={file.uid}>
                    {file.url ? (
                      <Typography.Link href={file.url}>{file.name}</Typography.Link>
                    ) : (
                      <Typography.Text>{file.name}</Typography.Text>
                    )}
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
