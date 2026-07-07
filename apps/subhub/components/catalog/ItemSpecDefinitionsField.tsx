"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Select, Typography } from "antd";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { FormSection } from "@/components/form/FormSection";

import type { ItemDetailFormValues } from "./ItemDetailForm";

type ParticipatesRow = ItemDetailFormValues["spec_participation"]["participates"][number];

const findParticipation = (
  participates: ParticipatesRow[],
  specDefId: string | undefined,
  index: number,
): ParticipatesRow | undefined => {
  if (specDefId) {
    const match = participates.find((row) => row.spec_def_id === specDefId);
    if (match) {
      return match;
    }
  }
  return participates[index];
};

const isAssignedHere = (
  participation: ParticipatesRow | undefined,
  categoryId: string,
): boolean => participation?.assign_item_id === categoryId;

const canToggleParticipation = (
  participation: ParticipatesRow | undefined,
  categoryId: string,
): boolean => {
  if (!participation || isAssignedHere(participation, categoryId)) {
    return false;
  }
  return participation.state === "inherited" || participation.excluded_here;
};

const isRowEditable = (
  isRoot: boolean,
  participation: ParticipatesRow | undefined,
  categoryId: string,
  isNewRow: boolean,
): boolean => {
  if (isNewRow) {
    return isRoot;
  }
  if (!participation?.assign_item_id) {
    return isRoot;
  }
  return participation.assign_item_id === categoryId;
};

type ItemSpecDefinitionsFieldProps = {
  categoryId: string;
  isCreate: boolean;
  manifest: Manifest;
};

export const ItemSpecDefinitionsField = ({
  categoryId,
  isCreate,
  manifest,
}: ItemSpecDefinitionsFieldProps) => {
  const { control, watch, setValue } = useFormContext<ItemDetailFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "spec_definitions",
  });
  const definitions = watch("spec_definitions");
  const isRoot = watch("profile.is_root") ?? false;
  const canRead = fieldAllows(manifest, "spec_definitions", "read");
  const canWriteDefinitions = fieldAllows(manifest, "spec_definitions", "write");
  const canWriteParticipation = fieldAllows(manifest, "spec_participation", "write");
  const participates = watch("spec_participation.participates");

  if (!canRead || isCreate) {
    return null;
  }

  const removeRow = (index: number) => {
    const removedDef = definitions[index];
    remove(index);
    const removedSpecDefId = removedDef?.id;
    setValue(
      "spec_participation.participates",
      removedSpecDefId
        ? participates.filter((row) => row.spec_def_id !== removedSpecDefId)
        : participates.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  return (
    <FormSection title="Spec definitions">
      {fields.length === 0 ? (
        <Typography.Text type="secondary">No spec definitions yet.</Typography.Text>
      ) : null}
      <div style={{ display: "grid", gap: 16 }}>
        {fields.map((field, index) => {
          const definition = definitions[index];
          const specDefId = definition?.id;
          const isNewRow = !specDefId;
          const participation = findParticipation(participates, specDefId, index);
          const showParticipationToggle = canToggleParticipation(participation, categoryId);
          const editable = canWriteDefinitions && isRowEditable(isRoot, participation, categoryId, isNewRow);
          const participatesActive = participation?.active ?? false;
          const checkboxDisabled =
            !canWriteParticipation ||
            (participation?.state === "excluded" && !participation.excluded_here);
          const rowInactive = Boolean(participation?.excluded_here && !participatesActive);

          return (
            <div
              key={field.id}
              style={{
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 8,
                padding: 12,
                display: "grid",
                gap: 8,
                opacity: rowInactive ? 0.55 : 1,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {showParticipationToggle && participation ? (
                  <Controller
                    control={control}
                    name="spec_participation.participates"
                    render={({ field: participationField }) => {
                      const participationIndex = participationField.value.findIndex(
                        (row) => row.spec_def_id === participation.spec_def_id,
                      );
                      const fieldActive =
                        participationIndex >= 0
                          ? (participationField.value[participationIndex]?.active ?? false)
                          : participatesActive;

                      return (
                      <Checkbox
                        checked={fieldActive}
                        disabled={checkboxDisabled}
                        title="Include this inherited spec under this category"
                        onChange={(event) => {
                          if (participationIndex < 0) {
                            return;
                          }
                          const next = [...participationField.value];
                          next[participationIndex] = {
                            ...participationField.value[participationIndex],
                            active: event.target.checked,
                          };
                          participationField.onChange(next);
                        }}
                      />
                      );
                    }}
                  />
                ) : null}
                {editable ? (
                  <>
                    <Controller
                      control={control}
                      name={`spec_definitions.${index}.display_name`}
                      render={({ field: nameField }) => (
                        <Input {...nameField} placeholder="Display name" />
                      )}
                    />
                    <Controller
                      control={control}
                      name={`spec_definitions.${index}.value_type`}
                      render={({ field: typeField }) => (
                        <Select
                          style={{ minWidth: 120 }}
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
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeRow(index)}
                    />
                  </>
                ) : (
                  <>
                    <Typography.Text>{definition?.display_name || "—"}</Typography.Text>
                    <Typography.Text type="secondary">
                      ({definition?.value_type ?? "enum"})
                    </Typography.Text>
                  </>
                )}
              </div>
              <Controller
                control={control}
                name={`spec_definitions.${index}.value_type`}
                render={({ field: typeField }) =>
                  typeField.value === "enum" ? (
                    editable ? (
                      <SpecOptionsEditor index={index} />
                    ) : (
                      <SpecOptionsReadOnly index={index} />
                    )
                  ) : (
                    <span />
                  )
                }
              />
            </div>
          );
        })}
      </div>
      {canWriteDefinitions && isRoot ? (
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

const SpecOptionsReadOnly = ({ index }: { index: number }) => {
  const { watch } = useFormContext<ItemDetailFormValues>();
  const options = watch(`spec_definitions.${index}.options`) ?? [];

  if (options.length === 0) {
    return null;
  }

  return (
    <div style={{ paddingLeft: 12 }}>
      <Typography.Text type="secondary">Options: </Typography.Text>
      <Typography.Text>
        {options.map((option) => option.display_name).filter(Boolean).join(", ") || "—"}
      </Typography.Text>
    </div>
  );
};

const SpecOptionsEditor = ({ index }: { index: number }) => {
  const { control } = useFormContext<ItemDetailFormValues>();
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
              <Input {...optionField} placeholder="Option label" />
            )}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => remove(optionIndex)}
          />
        </div>
      ))}
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
    </div>
  );
};
