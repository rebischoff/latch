"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { FieldControl } from "@latch/react";
import { InputNumber, Skeleton, Typography } from "antd";
import { useMemo } from "react";
import {
  Controller,
  useFormContext,
  type UseFormSetError,
} from "react-hook-form";
import {
  FieldArrayTable,
  type FieldArrayTableColumn,
} from "@/components/form/FieldArrayTable";
import { FormSection } from "@/components/form/FormSection";
import { LinkedSelectControl, LinkedSelectInput } from "@/components/form/LinkedSelectInput";
import { findSelectLabel } from "@/components/form/optionHelpers";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { useFormUi } from "@/components/surface/useFormUi";

import type { ItemDetailFormValues } from "@/components/catalog/ItemDetailForm";

type ItemCommercialFieldsProps = {
  manifest: Manifest;
  nodeType: "scope" | "category" | "item";
};

type SelectOption = { value: string; label: string };

const unwrapCatalogName = (row: Record<string, unknown>): string => {
  const nameField = row.name as { name?: string } | undefined;
  return nameField?.name ?? "";
};

const catalogOptionsFromRows = (
  rows: Array<Record<string, unknown>> | undefined,
): SelectOption[] =>
  (rows ?? [])
    .map((row) => ({
      value: String(row.id),
      label: unwrapCatalogName(row),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

const mergeDisplayOptions = (
  options: SelectOption[],
  value: string | null | undefined,
  displayName: string | undefined,
): SelectOption[] => {
  if (!value || !displayName || options.some((option) => option.value === value)) {
    return options;
  }

  return [...options, { value, label: displayName }].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
};

export const validateItemLaborPhaseDuplicates = (
  rows: ItemDetailFormValues["item_labor_phase"],
  setError: UseFormSetError<ItemDetailFormValues>,
): boolean => {
  const seen = new Map<string, number>();
  let valid = true;

  rows.forEach((row, index) => {
    if (!row.labor_phase_id) {
      return;
    }

    const priorIndex = seen.get(row.labor_phase_id);
    if (priorIndex !== undefined) {
      const message = "Each labor phase can appear only once";
      setError(`item_labor_phase.${index}.labor_phase_id`, { message });
      setError(`item_labor_phase.${priorIndex}.labor_phase_id`, { message });
      valid = false;
    } else {
      seen.set(row.labor_phase_id, index);
    }
  });

  return valid;
};

const PhaseCell = ({
  index,
  writable,
  disabled,
  options,
  loading,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  options: SelectOption[];
  loading: boolean;
}) => {
  const { setValue } = useFormContext<ItemDetailFormValues>();

  return (
    <Controller<ItemDetailFormValues>
      name={`item_labor_phase.${index}.labor_phase_id`}
      render={({ field, fieldState }) => {
        if (loading) {
          return <Skeleton.Input active size="small" block />;
        }

        if (!writable) {
          const phaseId = typeof field.value === "string" ? field.value : null;
          return (
            <Typography.Text>
              {findSelectLabel(options, phaseId) ?? "—"}
            </Typography.Text>
          );
        }

        return (
          <LinkedSelectControl
            mode="write"
            options={options}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(phaseId) => {
              field.onChange(phaseId);
              const label = findSelectLabel(options, phaseId);
              setValue(`item_labor_phase.${index}.labor_phase_name`, label ?? "", {
                shouldDirty: true,
              });
            }}
            onBlur={field.onBlur}
            disabled={disabled}
            status={fieldState.error ? "error" : undefined}
            placeholder="Select phase"
          />
        );
      }}
    />
  );
};

const RateCell = ({
  index,
  writable,
  disabled,
  options,
  loading,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  options: SelectOption[];
  loading: boolean;
}) => {
  const { setValue } = useFormContext<ItemDetailFormValues>();

  return (
    <Controller<ItemDetailFormValues>
      name={`item_labor_phase.${index}.labor_rate_type_id`}
      render={({ field, fieldState }) => {
        if (loading) {
          return <Skeleton.Input active size="small" block />;
        }

        if (!writable) {
          const rateId = typeof field.value === "string" ? field.value : null;
          return (
            <Typography.Text>
              {findSelectLabel(options, rateId) ?? "—"}
            </Typography.Text>
          );
        }

        return (
          <LinkedSelectControl
            mode="write"
            options={options}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(rateId) => {
              field.onChange(rateId);
              const label = findSelectLabel(options, rateId);
              setValue(`item_labor_phase.${index}.labor_rate_type_name`, label ?? "", {
                shouldDirty: true,
              });
            }}
            onBlur={field.onBlur}
            disabled={disabled}
            status={fieldState.error ? "error" : undefined}
            placeholder="Select rate"
          />
        );
      }}
    />
  );
};

const HoursCell = ({
  index,
  writable,
  disabled,
  loading,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
  loading: boolean;
}) => (
  <Controller<ItemDetailFormValues>
    name={`item_labor_phase.${index}.hours_per_unit`}
    render={({ field, fieldState }) => {
      if (loading) {
        return <Skeleton.Input active size="small" block />;
      }

      if (!writable) {
        return <Typography.Text>{Number(field.value ?? 0).toFixed(2)}</Typography.Text>;
      }

      return (
        <InputNumber
          value={field.value ?? null}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled}
          min={0}
          precision={2}
          step={0.25}
          style={{ width: "100%" }}
          status={fieldState.error ? "error" : undefined}
        />
      );
    }}
  />
);

export const ItemCommercialFields = ({ manifest, nodeType }: ItemCommercialFieldsProps) => {
  const { watch } = useFormContext<ItemDetailFormValues>();
  const { disabled } = useFormUi();
  const laborPhaseRows = watch("item_labor_phase") ?? [];
  const isQuotableLeaf = nodeType === "item";
  const isPolicyNode = nodeType === "scope" || nodeType === "category";

  const { data: laborPhases, isLoading: laborPhasesLoading } =
    useSurfaceList("labor_phase_table");
  const { data: laborRates, isLoading: laborRatesLoading } =
    useSurfaceList("labor_rate_type_table");
  const { data: freightRates, isLoading: freightRatesLoading } =
    useSurfaceList("freight_rate_type_table");
  const { data: incidentalRates, isLoading: incidentalRatesLoading } =
    useSurfaceList("incidental_rate_type_table");
  const { data: markupTypes, isLoading: markupTypesLoading } =
    useSurfaceList("markup_type_table");

  const laborPhaseOptions = useMemo(
    () => catalogOptionsFromRows(laborPhases?.data.rows as Array<Record<string, unknown>>),
    [laborPhases?.data.rows],
  );

  const laborRateOptions = useMemo(() => {
    const base = catalogOptionsFromRows(
      laborRates?.data.rows as Array<Record<string, unknown>>,
    );
    let merged = base;
    for (const row of laborPhaseRows) {
      if (row.labor_rate_type_id && row.labor_rate_type_name) {
        merged = mergeDisplayOptions(
          merged,
          row.labor_rate_type_id,
          row.labor_rate_type_name,
        );
      }
    }
    return merged;
  }, [laborPhaseRows, laborRates?.data.rows]);

  const freightOptions = catalogOptionsFromRows(
    freightRates?.data.rows as Array<Record<string, unknown>>,
  );
  const incidentalOptions = catalogOptionsFromRows(
    incidentalRates?.data.rows as Array<Record<string, unknown>>,
  );
  const markupOptions = catalogOptionsFromRows(
    markupTypes?.data.rows as Array<Record<string, unknown>>,
  );

  const laborPhaseWritable = fieldAllows(manifest, "item_labor_phase", "write");
  const pickerLoading =
    laborPhasesLoading ||
    laborRatesLoading ||
    freightRatesLoading ||
    incidentalRatesLoading ||
    markupTypesLoading;

  const laborColumns = useMemo<
    FieldArrayTableColumn<ItemDetailFormValues, "item_labor_phase">[]
  >(
    () => [
      {
        key: "labor_phase_id",
        title: "Phase",
        width: "34%",
        render: ({ index, writable: rowWritable, disabled: rowDisabled, loading }) => (
          <PhaseCell
            index={index}
            writable={rowWritable}
            disabled={rowDisabled}
            options={laborPhaseOptions}
            loading={loading || pickerLoading}
          />
        ),
      },
      {
        key: "labor_rate_type_id",
        title: "Labor rate",
        width: "34%",
        render: ({ index, writable: rowWritable, disabled: rowDisabled, loading }) => (
          <RateCell
            index={index}
            writable={rowWritable}
            disabled={rowDisabled}
            options={laborRateOptions}
            loading={loading || pickerLoading}
          />
        ),
      },
      {
        key: "hours_per_unit",
        title: "Hrs/unit",
        width: 120,
        render: ({ index, writable: rowWritable, disabled: rowDisabled, loading }) => (
          <HoursCell
            index={index}
            writable={rowWritable}
            disabled={rowDisabled}
            loading={loading || pickerLoading}
          />
        ),
      },
    ],
    [laborPhaseOptions, laborRateOptions, pickerLoading],
  );

  const showCommercial =
    (isPolicyNode && fieldAllows(manifest, "commercial", "read")) ||
    (isQuotableLeaf &&
      (fieldAllows(manifest, "commercial", "read") ||
        fieldAllows(manifest, "item_labor_phase", "read")));

  if (!showCommercial) {
    return null;
  }

  return (
    <FormSection title="Commercial">
      {isPolicyNode && fieldAllows(manifest, "commercial", "read") ? (
        <>
          <LinkedSelectInput<ItemDetailFormValues>
            field="commercial"
            name="commercial.freight_rate_type_id"
            label="Freight rate"
            options={freightOptions}
            loading={freightRatesLoading}
            selectProps={{ allowClear: true }}
          />
          <LinkedSelectInput<ItemDetailFormValues>
            field="commercial"
            name="commercial.incidental_rate_type_id"
            label="Incidental rate"
            options={incidentalOptions}
            loading={incidentalRatesLoading}
            selectProps={{ allowClear: true }}
          />
          <LinkedSelectInput<ItemDetailFormValues>
            field="commercial"
            name="commercial.markup_type_id"
            label="Markup type"
            options={markupOptions}
            loading={markupTypesLoading}
            selectProps={{ allowClear: true }}
          />
        </>
      ) : null}

      {isQuotableLeaf && fieldAllows(manifest, "commercial", "read") ? (
        <Controller<ItemDetailFormValues>
          name="commercial.fallback_unit_cost"
          render={({ field, fieldState }) => (
            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                Fallback unit cost
              </Typography.Text>
              <InputNumber
                value={field.value ?? 0}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={disabled || !fieldAllows(manifest, "commercial", "write")}
                min={0}
                precision={2}
                step={0.01}
                style={{ width: "100%" }}
                status={fieldState.error ? "error" : undefined}
              />
            </div>
          )}
        />
      ) : null}

      {isQuotableLeaf && fieldAllows(manifest, "item_labor_phase", "read") ? (
        <FieldControl manifest={manifest} field="item_labor_phase">
          {laborPhaseRows.length === 0 ? (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              No labor phases configured on this node.
            </Typography.Paragraph>
          ) : null}
          <FieldArrayTable<ItemDetailFormValues, "item_labor_phase">
            field="item_labor_phase"
            name="item_labor_phase"
            columns={laborColumns}
            createRow={() => ({
              labor_phase_id: "",
              labor_phase_name: "",
              labor_rate_type_id: "",
              labor_rate_type_name: "",
              hours_per_unit: 0,
              sort_order: laborPhaseRows.length + 1,
            })}
            addLabel="Add labor phase"
            allowAdd={laborPhaseWritable && !disabled}
          />
        </FieldControl>
      ) : null}
    </FormSection>
  );
};
