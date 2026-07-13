"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { Button, Divider, Input, InputNumber, Popover, Select, Typography } from "antd";
import { useMemo, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import type { FieldArrayTableColumn } from "@/components/form/FieldArrayTable";
import { FieldArrayTable } from "@/components/form/FieldArrayTable";
import { FormSection } from "@/components/form/FormSection";
import { TABLE_WIDTH_LG } from "@/components/form/formLayout";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";

import type { ItemDetailFormValues } from "./ItemDetailForm";

type ItemSpecDefinitionsFieldProps = {
  isCreate: boolean;
  manifest: Manifest;
};

type SpecUnitOption = {
  dimension: string;
  id: string;
  label: string;
  symbol: string;
};

const isTypeLocked = (row: ItemDetailFormValues["spec_definitions"][number]): boolean =>
  (row.in_use_part_count ?? 0) > 0;

const isUnitLocked = isTypeLocked;

const unwrapUnitRows = (
  rows: Array<Record<string, unknown>> | undefined,
): SpecUnitOption[] =>
  (rows ?? []).map((row) => {
    const symbol = (row.symbol as { symbol?: string } | undefined)?.symbol ?? "";
    const name = (row.name as { name?: string } | undefined)?.name ?? "";
    const dimension =
      (row.dimension as { dimension?: string } | undefined)?.dimension ?? "";
    return {
      id: String(row.id),
      dimension,
      symbol,
      label: symbol ? `${symbol} — ${name}` : name,
    };
  });

const formatNumberUnitSummary = (
  unitId: string | null | undefined,
  decimalPlaces: number | null | undefined,
  unitOptions: SpecUnitOption[],
): string => {
  if (!unitId) {
    return "Set unit…";
  }
  const unit = unitOptions.find((row) => row.id === unitId);
  const symbol = unit?.symbol ?? unitId;
  const dp = decimalPlaces ?? 0;
  return `${symbol} · ${dp} dp`;
};

const formatEnumDetailsSummary = (
  options: ItemDetailFormValues["spec_definitions"][number]["options"],
  presets: ItemDetailFormValues["spec_definitions"][number]["presets"],
): string => {
  const optionSummary =
    options.length > 0
      ? options.map((row) => row.display_name).filter(Boolean).join(", ")
      : "No options";
  const presetCount = presets?.length ?? 0;
  if (presetCount === 0) {
    return optionSummary;
  }
  return `${optionSummary} · ${presetCount} preset${presetCount === 1 ? "" : "s"}`;
};

const formatNumberDetailsSummary = (
  unitId: string | null | undefined,
  decimalPlaces: number | null | undefined,
  unitOptions: SpecUnitOption[],
  presets: ItemDetailFormValues["spec_definitions"][number]["presets"],
): string => {
  const base = formatNumberUnitSummary(unitId, decimalPlaces, unitOptions);
  const presetCount = presets?.length ?? 0;
  if (presetCount === 0) {
    return base;
  }
  return `${base} · ${presetCount} preset${presetCount === 1 ? "" : "s"}`;
};

type SpecThresholdPresetsEditorProps = {
  disabled: boolean;
  index: number;
  mode: "enum" | "number";
  optionChoices?: Array<{ label: string; value: string }>;
  writable: boolean;
};

const SpecThresholdPresetsEditor = ({
  index,
  writable,
  disabled,
  mode,
  optionChoices = [],
}: SpecThresholdPresetsEditorProps) => {
  const { control, watch, setValue } = useFormContext<ItemDetailFormValues>();
  const presets = watch(`spec_definitions.${index}.presets`) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Typography.Text type="secondary">Threshold presets</Typography.Text>
      {presets.map((preset, presetIndex) => (
        <div
          key={preset.id ?? `new-preset-${presetIndex}`}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <Controller
              control={control}
              name={`spec_definitions.${index}.presets.${presetIndex}.label`}
              render={({ field }) => (
                <Input
                  {...field}
                  disabled={!writable || disabled}
                  placeholder="Preset label"
                  style={{ flex: 1 }}
                />
              )}
            />
            {writable && !disabled ? (
              <Button
                type="text"
                danger
                onClick={() => {
                  const next = presets.filter((_, i) => i !== presetIndex);
                  setValue(`spec_definitions.${index}.presets`, next, { shouldDirty: true });
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
          {mode === "enum" ? (
            <Controller
              control={control}
              name={`spec_definitions.${index}.presets.${presetIndex}.option_ids`}
              render={({ field }) => (
                <Select
                  allowClear
                  disabled={!writable || disabled}
                  mode="multiple"
                  options={optionChoices}
                  placeholder="Options in preset"
                  style={{ width: "100%" }}
                  value={field.value ?? []}
                  onChange={(value) => field.onChange(value)}
                />
              )}
            />
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Controller
                control={control}
                name={`spec_definitions.${index}.presets.${presetIndex}.value_number`}
                render={({ field }) => (
                  <InputNumber
                    disabled={!writable || disabled}
                    placeholder="Min"
                    style={{ flex: 1 }}
                    value={field.value ?? undefined}
                    onChange={(value) => field.onChange(value ?? null)}
                  />
                )}
              />
              <Controller
                control={control}
                name={`spec_definitions.${index}.presets.${presetIndex}.value_number_max`}
                render={({ field }) => (
                  <InputNumber
                    disabled={!writable || disabled}
                    placeholder="Max"
                    style={{ flex: 1 }}
                    value={field.value ?? undefined}
                    onChange={(value) => field.onChange(value ?? null)}
                  />
                )}
              />
            </div>
          )}
        </div>
      ))}
      {writable && !disabled ? (
        <Button
          type="dashed"
          onClick={() => {
            setValue(
              `spec_definitions.${index}.presets`,
              [
                ...presets,
                mode === "enum"
                  ? { label: "", sort_order: presets.length + 1, option_ids: [] }
                  : {
                      label: "",
                      sort_order: presets.length + 1,
                      value_number: null,
                      value_number_max: null,
                    },
              ],
              { shouldDirty: true },
            );
          }}
        >
          Add preset
        </Button>
      ) : null}
    </div>
  );
};

type SpecOptionsPopoverProps = {
  disabled: boolean;
  index: number;
  writable: boolean;
};

const SpecOptionsPopover = ({ index, writable, disabled }: SpecOptionsPopoverProps) => {
  const { control, watch, setValue } = useFormContext<ItemDetailFormValues>();
  const options = watch(`spec_definitions.${index}.options`) ?? [];
  const presets = watch(`spec_definitions.${index}.presets`) ?? [];
  const [open, setOpen] = useState(false);

  const optionChoices = options
    .filter((option) => option.id && option.display_name)
    .map((option) => ({
      value: option.id!,
      label: option.display_name,
    }));

  const summary = formatEnumDetailsSummary(options, presets);

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 280 }}>
      <Typography.Text type="secondary">Options</Typography.Text>
      {options.map((option, optionIndex) => (
        <div key={option.id ?? `new-${optionIndex}`} style={{ display: "flex", gap: 8 }}>
          <Controller
            control={control}
            name={`spec_definitions.${index}.options.${optionIndex}.display_name`}
            render={({ field }) => (
              <Input
                {...field}
                disabled={!writable || disabled}
                placeholder="Option name"
                style={{ flex: 1 }}
              />
            )}
          />
          {writable && !disabled ? (
            <Button
              type="text"
              danger
              onClick={() => {
                const next = options.filter((_, i) => i !== optionIndex);
                setValue(`spec_definitions.${index}.options`, next, { shouldDirty: true });
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      ))}
      {writable && !disabled ? (
        <Button
          type="dashed"
          onClick={() => {
            setValue(
              `spec_definitions.${index}.options`,
              [...options, { display_name: "", sort_order: options.length + 1 }],
              { shouldDirty: true },
            );
          }}
        >
          Add option
        </Button>
      ) : null}
      <Divider style={{ margin: "4px 0" }} />
      <SpecThresholdPresetsEditor
        index={index}
        writable={writable}
        disabled={disabled}
        mode="enum"
        optionChoices={optionChoices}
      />
    </div>
  );

  return (
    <Popover
      content={content}
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title="Enum details"
    >
      <Typography.Link disabled={!writable && options.length === 0 && presets.length === 0}>
        {summary}
      </Typography.Link>
    </Popover>
  );
};

type NumberDetailsPopoverProps = {
  disabled: boolean;
  index: number;
  locked: boolean;
  unitOptions: SpecUnitOption[];
  writable: boolean;
};

const NumberDetailsPopover = ({
  index,
  writable,
  disabled,
  locked,
  unitOptions,
}: NumberDetailsPopoverProps) => {
  const { control, watch } = useFormContext<ItemDetailFormValues>();
  const unitId = watch(`spec_definitions.${index}.unit_id`);
  const decimalPlaces = watch(`spec_definitions.${index}.decimal_places`);
  const presets = watch(`spec_definitions.${index}.presets`) ?? [];
  const [open, setOpen] = useState(false);

  const summary = formatNumberDetailsSummary(unitId, decimalPlaces, unitOptions, presets);

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 280 }}>
      <Controller
        control={control}
        name={`spec_definitions.${index}.unit_id`}
        render={({ field }) => (
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Unit
            </Typography.Text>
            <Select
              allowClear={false}
              disabled={!writable || disabled || locked}
              options={unitOptions.map((unit) => ({
                value: unit.id,
                label: unit.label,
              }))}
              placeholder="Select unit"
              style={{ width: "100%" }}
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value ?? null)}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name={`spec_definitions.${index}.decimal_places`}
        render={({ field }) => (
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Decimal places
            </Typography.Text>
            <InputNumber
              min={0}
              max={10}
              disabled={!writable || disabled || locked}
              placeholder="0"
              style={{ width: "100%" }}
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value ?? null)}
            />
          </div>
        )}
      />
      <Divider style={{ margin: "4px 0" }} />
      <SpecThresholdPresetsEditor
        index={index}
        writable={writable}
        disabled={disabled}
        mode="number"
      />
    </div>
  );

  return (
    <Popover
      content={content}
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title="Number details"
    >
      <Typography.Link disabled={!writable && !unitId && presets.length === 0}>
        {summary}
      </Typography.Link>
    </Popover>
  );
};

type SpecDefinitionDetailsCellProps = {
  disabled: boolean;
  index: number;
  unitOptions: SpecUnitOption[];
  writable: boolean;
};

const SpecDefinitionDetailsCell = ({
  index,
  writable,
  disabled,
  unitOptions,
}: SpecDefinitionDetailsCellProps) => {
  const valueType = useWatch({
    name: `spec_definitions.${index}.value_type`,
    defaultValue: "enum" as const,
  });
  const row = useWatch({
    name: `spec_definitions.${index}`,
  });

  if (valueType === "boolean") {
    return null;
  }
  if (valueType === "enum") {
    return <SpecOptionsPopover index={index} writable={writable} disabled={disabled} />;
  }

  const locked = row ? isUnitLocked(row) : false;

  return (
    <NumberDetailsPopover
      index={index}
      writable={writable}
      disabled={disabled}
      locked={locked}
      unitOptions={unitOptions}
    />
  );
};

export const ItemSpecDefinitionsField = ({
  isCreate,
  manifest,
}: ItemSpecDefinitionsFieldProps) => {
  const { control, watch } = useFormContext<ItemDetailFormValues>();
  const nodeType = watch("profile.node_type") ?? "category";
  const definitions = watch("spec_definitions");
  const canRead = fieldAllows(manifest, "spec_definitions", "read");
  const canWrite = fieldAllows(manifest, "spec_definitions", "write");
  const { data: unitListData } = useSurfaceList("spec_unit_table");
  const unitOptions = useMemo(
    () => unwrapUnitRows(unitListData?.data.rows),
    [unitListData?.data.rows],
  );

  const columns = useMemo((): FieldArrayTableColumn<
    ItemDetailFormValues,
    "spec_definitions"
  >[] => {
    const result: FieldArrayTableColumn<ItemDetailFormValues, "spec_definitions">[] = [
      {
        key: "display_name",
        title: "Name",
        width: 220,
        render: ({ index, writable, disabled }) => (
          <Controller
            control={control}
            name={`spec_definitions.${index}.display_name`}
            render={({ field }) => (
              <Input {...field} disabled={!writable || disabled} placeholder="Display name" />
            )}
          />
        ),
      },
      {
        key: "value_type",
        title: "Type",
        width: 130,
        render: ({ index, writable, disabled }) => {
          const row = definitions[index];
          const locked = row ? isTypeLocked(row) : false;
          return (
            <Controller
              control={control}
              name={`spec_definitions.${index}.value_type`}
              render={({ field }) => (
                <Select
                  {...field}
                  disabled={!writable || disabled || locked}
                  options={[
                    { value: "enum", label: "Enum" },
                    { value: "boolean", label: "Boolean" },
                    { value: "number", label: "Number" },
                  ]}
                  style={{ width: "100%" }}
                />
              )}
            />
          );
        },
      },
      {
        key: "details",
        title: "Details",
        render: ({ index, writable, disabled }) => (
          <SpecDefinitionDetailsCell
            index={index}
            writable={writable}
            disabled={disabled}
            unitOptions={unitOptions}
          />
        ),
      },
    ];

    return result;
  }, [control, definitions, unitOptions]);

  if (!canRead || isCreate || nodeType !== "scope") {
    return null;
  }

  return (
    <FormSection title="Spec definitions" width="full">
      <FieldArrayTable<ItemDetailFormValues, "spec_definitions">
        field="spec_definitions"
        name="spec_definitions"
        columns={columns}
        maxWidth={TABLE_WIDTH_LG}
        orderable={canWrite}
        addLabel="Add spec"
        allowRemove={canWrite}
        createRow={() => ({
          display_name: "",
          value_type: "enum",
          sort_order: definitions.length + 1,
          options: [],
          presets: [],
          unit_id: null,
          decimal_places: null,
          in_use_part_count: 0,
        })}
      />
    </FormSection>
  );
};
