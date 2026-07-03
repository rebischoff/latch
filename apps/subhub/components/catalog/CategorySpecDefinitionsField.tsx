"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { fieldAllows, type Manifest } from "@latch/contracts";
import { Button, Input, Select, Typography } from "antd";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { FormSection } from "@/components/form/FormSection";

import type { CategoryDetailFormValues } from "./CategoryDetailForm";

type CategorySpecDefinitionsFieldProps = {
  manifest: Manifest;
};

export const CategorySpecDefinitionsField = ({
  manifest,
}: CategorySpecDefinitionsFieldProps) => {
  const { control } = useFormContext<CategoryDetailFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "spec_definitions",
  });
  const canRead = fieldAllows(manifest, "spec_definitions", "read");
  const canWrite = fieldAllows(manifest, "spec_definitions", "write");

  if (!canRead) {
    return null;
  }

  return (
    <FormSection title="Spec definitions">
      {fields.length === 0 ? (
        <Typography.Text type="secondary">No spec definitions yet.</Typography.Text>
      ) : null}
      <div style={{ display: "grid", gap: 16 }}>
        {fields.map((field, index) => (
          <div
            key={field.id}
            style={{
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 8,
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Controller
                control={control}
                name={`spec_definitions.${index}.display_name`}
                render={({ field: nameField }) => (
                  <Input
                    {...nameField}
                    placeholder="Display name"
                    disabled={!canWrite}
                  />
                )}
              />
              <Controller
                control={control}
                name={`spec_definitions.${index}.value_type`}
                render={({ field: typeField }) => (
                  <Select
                    style={{ minWidth: 120 }}
                    disabled={!canWrite}
                    value={typeField.value}
                    onChange={typeField.onChange}
                    options={[
                      { value: "enum", label: "Enum" },
                      { value: "boolean", label: "Boolean" },
                      { value: "text", label: "Text" },
                    ]}
                  />
                )}
              />
              {canWrite ? (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(index)}
                />
              ) : null}
            </div>
            <Controller
              control={control}
              name={`spec_definitions.${index}.value_type`}
              render={({ field: typeField }) =>
                typeField.value === "enum" ? (
                  <SpecOptionsEditor index={index} canWrite={canWrite} />
                ) : (
                  <span />
                )
              }
            />
          </div>
        ))}
      </div>
      {canWrite ? (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 12 }}
          onClick={() =>
            append({
              display_name: "",
              value_type: "enum",
              filter_mode: "required",
              sort_order: fields.length + 1,
              options: [],
            })
          }
        >
          Add spec definition
        </Button>
      ) : null}
    </FormSection>
  );
};

const SpecOptionsEditor = ({
  index,
  canWrite,
}: {
  index: number;
  canWrite: boolean;
}) => {
  const { control } = useFormContext<CategoryDetailFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `spec_definitions.${index}.options`,
  });

  return (
    <div style={{ paddingLeft: 12, display: "grid", gap: 8 }}>
      <Typography.Text type="secondary">Options</Typography.Text>
      {fields.map((field, optionIndex) => (
        <div key={field.id} style={{ display: "flex", gap: 8 }}>
          <Controller
            control={control}
            name={`spec_definitions.${index}.options.${optionIndex}.display_name`}
            render={({ field: optionField }) => (
              <Input
                {...optionField}
                placeholder="Option label"
                disabled={!canWrite}
              />
            )}
          />
          {canWrite ? (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => remove(optionIndex)}
            />
          ) : null}
        </div>
      ))}
      {canWrite ? (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() =>
            append({
              display_name: "",
              sort_order: fields.length + 1,
            })
          }
        >
          Add option
        </Button>
      ) : null}
    </div>
  );
};
