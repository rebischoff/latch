"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { fieldAllows, type Manifest } from "@latch/contracts";
import { FieldControl } from "@latch/react";
import { Button, Checkbox, InputNumber, Skeleton, Table, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldPath,
  type UseFormSetError,
} from "react-hook-form";
import { LaborPhaseAddButton } from "@/components/form/FieldArrayTable";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import { FormSection } from "@/components/form/FormSection";
import { TABLE_WIDTH_LG } from "@/components/form/formLayout";
import { LinkedSelectControl } from "@/components/form/LinkedSelectInput";
import { findSelectLabel } from "@/components/form/optionHelpers";
import type { ItemTreeNode } from "@/lib/catalog/descriptors/item-list";
import {
  buildAncestorChain,
  displayCommercialRateTypeId,
  flattenItemTreeCommercial,
  hasCommercialRateOverride,
  resolveAncestryRateTypeId,
  summarizeAddOnCatalogRow,
  summarizeMarkupCatalogRow,
  type CommercialFamily,
} from "@/lib/catalog/item-commercial-display";
import {
  buildItemLaborPhaseDisplayRows,
  type ItemLaborPhaseDisplayRow,
} from "@/lib/catalog/item-labor-phase-ui-state";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { useFormUi } from "@/components/surface/useFormUi";

import type { ItemDetailFormValues } from "@/components/catalog/ItemDetailForm";

type ItemCommercialFieldsProps = {
  categoryId: string;
  isCreate: boolean;
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

const createEmptyLaborPhaseRow = (
  sortOrder: number,
): ItemDetailFormValues["item_labor_phase"][number] => ({
  labor_phase_id: "",
  labor_phase_name: "",
  labor_rate_type_id: "",
  labor_rate_type_name: "",
  hours_per_unit: 0,
  sort_order: sortOrder,
});

const createOwnRowFromInherited = (
  row: Extract<ItemLaborPhaseDisplayRow, { kind: "inherited" }>,
  sortOrder: number,
): ItemDetailFormValues["item_labor_phase"][number] => ({
  labor_phase_id: row.labor_phase_id,
  labor_phase_name: row.labor_phase_name,
  labor_rate_type_id: row.labor_rate_type_id,
  labor_rate_type_name: row.labor_rate_type_name,
  hours_per_unit: row.hours_per_unit,
  sort_order: sortOrder,
});

type ItemLaborPhaseSectionProps = {
  laborPhaseOptions: SelectOption[];
  laborRateOptions: SelectOption[];
  pickerLoading: boolean;
  writable: boolean;
};

const ItemLaborPhaseSection = ({
  laborPhaseOptions,
  laborRateOptions,
  pickerLoading,
  writable,
}: ItemLaborPhaseSectionProps) => {
  const { control } = useFormContext<ItemDetailFormValues>();
  const { disabled, loading: formLoading } = useFormUi();
  const fieldArray = useFieldArray({ control, name: "item_labor_phase" });
  const { fields, append, remove } = fieldArray;
  const ownRows = useWatch({ control, name: "item_labor_phase" }) ?? [];
  const resolvedRows = useWatch({ control, name: "resolved_labor_phase" }) ?? [];

  const displayRows = useMemo(
    () =>
      buildItemLaborPhaseDisplayRows({
        ownRows,
        resolvedRows,
      }),
    [ownRows, resolvedRows],
  );

  const loading = formLoading || pickerLoading;
  const canWrite = writable && !disabled;

  const beginOverride = (row: Extract<ItemLaborPhaseDisplayRow, { kind: "inherited" }>) => {
    append(createOwnRowFromInherited(row, fields.length + 1));
  };

  const addLaborPhase = () => {
    append(createEmptyLaborPhaseRow(fields.length + 1));
  };

  if (displayRows.length === 0) {
    return (
      <>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          No labor phases configured on this node.
        </Typography.Paragraph>
        {canWrite ? (
          <LaborPhaseAddButton disabled={disabled} onClick={addLaborPhase} />
        ) : null}
      </>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: TABLE_WIDTH_LG }}>
      <Table<ItemLaborPhaseDisplayRow>
        size="small"
        pagination={false}
        rowKey={(row) =>
          row.kind === "own"
            ? `own-${row.ownIndex}-${row.labor_phase_id || "new"}`
            : `inherited-${row.labor_phase_id}`
        }
        dataSource={displayRows}
        columns={[
          {
            title: "Phase",
            key: "phase",
            width: "32%",
            render: (_value, row) => {
              if (row.kind === "inherited") {
                return (
                  <div>
                    <Typography.Text>{row.labor_phase_name || "—"}</Typography.Text>
                    {row.source_item_name ? (
                      <Typography.Paragraph
                        type="secondary"
                        style={{ marginBottom: 0, marginTop: 2, fontSize: 12 }}
                      >
                        Inherited from &ldquo;{row.source_item_name}&rdquo;
                      </Typography.Paragraph>
                    ) : null}
                  </div>
                );
              }
              return (
                <PhaseCell
                  index={row.ownIndex}
                  writable={canWrite}
                  disabled={disabled}
                  options={laborPhaseOptions}
                  loading={loading}
                />
              );
            },
          },
          {
            title: "Labor rate",
            key: "rate",
            width: "32%",
            render: (_value, row) => {
              if (row.kind === "inherited") {
                return <Typography.Text>{row.labor_rate_type_name || "—"}</Typography.Text>;
              }
              return (
                <RateCell
                  index={row.ownIndex}
                  writable={canWrite}
                  disabled={disabled}
                  options={laborRateOptions}
                  loading={loading}
                />
              );
            },
          },
          {
            title: "Hrs/unit",
            key: "hours",
            width: 100,
            render: (_value, row) => {
              if (row.kind === "inherited") {
                return (
                  <Typography.Text>
                    {Number(row.hours_per_unit ?? 0).toFixed(2)}
                  </Typography.Text>
                );
              }
              return (
                <HoursCell
                  index={row.ownIndex}
                  writable={canWrite}
                  disabled={disabled}
                  loading={loading}
                />
              );
            },
          },
          {
            title: "",
            key: "actions",
            width: 96,
            align: "center",
            render: (_value, row) => {
              if (!canWrite) {
                return null;
              }
              if (row.kind === "inherited") {
                return (
                  <Button type="link" size="small" onClick={() => beginOverride(row)}>
                    Override
                  </Button>
                );
              }
              return (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Remove row"
                  disabled={disabled}
                  onClick={() => remove(row.ownIndex)}
                />
              );
            },
          },
        ]}
        footer={
          canWrite
            ? () => <LaborPhaseAddButton disabled={disabled} onClick={addLaborPhase} />
            : undefined
        }
      />
    </div>
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

    const key = row.labor_phase_id;
    const priorIndex = seen.get(key);
    if (priorIndex !== undefined) {
      const message = "Each labor phase can appear only once";
      setError(`item_labor_phase.${index}.labor_phase_id`, { message });
      setError(`item_labor_phase.${priorIndex}.labor_phase_id`, { message });
      valid = false;
    } else {
      seen.set(key, index);
    }
  });

  return valid;
};

export const validateItemLaborPhaseRowsComplete = (
  rows: ItemDetailFormValues["item_labor_phase"],
  setError: UseFormSetError<ItemDetailFormValues>,
): boolean => {
  let valid = true;

  rows.forEach((row, index) => {
    const hasPhase = Boolean(row.labor_phase_id);
    const hasRate = Boolean(row.labor_rate_type_id);
    if (hasPhase === hasRate) {
      return;
    }

    if (!hasPhase) {
      setError(`item_labor_phase.${index}.labor_phase_id`, {
        message: "Select a labor phase",
      });
    }
    if (!hasRate) {
      setError(`item_labor_phase.${index}.labor_rate_type_id`, {
        message: "Select a labor rate",
      });
    }
    valid = false;
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

const RateFieldSuffix = ({ summary }: { summary: string | null }) =>
  summary ? (
    <Typography.Text
      type="secondary"
      style={{ flexShrink: 0, fontSize: 12, whiteSpace: "nowrap" }}
    >
      {summary}
    </Typography.Text>
  ) : null;

const commercialRateFieldName: Record<
  CommercialFamily,
  FieldPath<ItemDetailFormValues>
> = {
  freight: "commercial.freight_rate_type_id",
  incidental: "commercial.incidental_rate_type_id",
  markup: "commercial.markup_type_id",
};

type ItemCommercialRateFieldProps = {
  ancestorChain: string[];
  catalogRows: Array<Record<string, unknown>> | undefined;
  commercialIndex: ReturnType<typeof flattenItemTreeCommercial>;
  disabled: boolean;
  family: CommercialFamily;
  isChild: boolean;
  label: string;
  loading: boolean;
  options: SelectOption[];
  pathKey: string;
  writable: boolean;
};

const ItemCommercialRateField = ({
  ancestorChain,
  catalogRows,
  commercialIndex,
  disabled,
  family,
  isChild,
  label,
  loading,
  options,
  pathKey,
  writable,
}: ItemCommercialRateFieldProps) => {
  const { control, setValue } = useFormContext<ItemDetailFormValues>();
  const fieldName = commercialRateFieldName[family];
  const ownValue = useWatch({ control, name: fieldName }) as string | null | undefined;
  const [forceOverride, setForceOverride] = useState(false);

  useEffect(() => {
    setForceOverride(false);
  }, [pathKey]);

  const ancestryRateTypeId = resolveAncestryRateTypeId(
    commercialIndex,
    ancestorChain,
    family,
  );
  const hasOverride = hasCommercialRateOverride(isChild, ownValue, forceOverride);
  const displayValue = displayCommercialRateTypeId(
    hasOverride,
    ownValue,
    ancestryRateTypeId,
  );
  const editable = writable && hasOverride;

  const rateSummary =
    family === "markup"
      ? summarizeMarkupCatalogRow(catalogRows, displayValue)
      : summarizeAddOnCatalogRow(catalogRows, displayValue);

  return (
    <Controller
      control={control}
      name={fieldName}
      render={({ field, fieldState }) => (
        <FormFieldItem
          label={label}
          error={fieldState.error?.message}
          controlPrefix={
            isChild ? (
              <Checkbox
                checked={hasOverride}
                disabled={disabled || !writable}
                onChange={(event) => {
                  if (event.target.checked) {
                    setForceOverride(true);
                    if (ancestryRateTypeId) {
                      setValue(fieldName, ancestryRateTypeId, { shouldDirty: true });
                    }
                  } else {
                    setForceOverride(false);
                    setValue(fieldName, null, { shouldDirty: true });
                  }
                }}
              />
            ) : undefined
          }
        >
          <LinkedSelectControl
            mode="write"
            value={displayValue}
            options={options}
            loading={loading}
            disabled={disabled || !editable}
            status={fieldState.error ? "error" : undefined}
            selectProps={{ allowClear: editable }}
            suffix={<RateFieldSuffix summary={rateSummary} />}
            onChange={(next) => {
              if (!editable) {
                return;
              }
              field.onChange(next || null);
            }}
            onBlur={field.onBlur}
          />
        </FormFieldItem>
      )}
    />
  );
};

export const ItemCommercialFields = ({
  categoryId,
  isCreate,
  manifest,
  nodeType,
}: ItemCommercialFieldsProps) => {
  const { watch } = useFormContext<ItemDetailFormValues>();
  const { disabled } = useFormUi();
  const parentId = watch("profile.parent_id");
  const isQuotableLeaf = nodeType === "item";
  const isChild = Boolean(parentId);
  const showCategoryLabor = nodeType === "category";
  const showLeafLabor = isQuotableLeaf;
  const laborPhaseRows = watch("item_labor_phase") ?? [];
  const commercialReadable = fieldAllows(manifest, "commercial", "read");
  const commercialWritable = fieldAllows(manifest, "commercial", "write");
  const marginPathKey = `${isCreate ? "create" : categoryId}:${parentId ?? "root"}`;

  const { data: itemList } = useSurfaceList("item_list");
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

  const itemTree = useMemo(() => {
    const row = itemList?.data.rows[0] as { tree?: ItemTreeNode[] } | undefined;
    return row?.tree ?? [];
  }, [itemList?.data.rows]);

  const commercialIndex = useMemo(
    () => flattenItemTreeCommercial(itemTree),
    [itemTree],
  );

  const ancestorChain = useMemo(
    () =>
      buildAncestorChain(
        commercialIndex,
        categoryId,
        parentId,
      ),
    [categoryId, commercialIndex, isCreate, parentId],
  );

  const freightRows = freightRates?.data.rows as Array<Record<string, unknown>> | undefined;
  const incidentalRows = incidentalRates?.data.rows as Array<Record<string, unknown>> | undefined;
  const markupRows = markupTypes?.data.rows as Array<Record<string, unknown>> | undefined;

  const laborPhaseWritable = fieldAllows(manifest, "item_labor_phase", "write");
  const pickerLoading =
    laborPhasesLoading ||
    laborRatesLoading ||
    freightRatesLoading ||
    incidentalRatesLoading ||
    markupTypesLoading;

  const showCommercial =
    commercialReadable || fieldAllows(manifest, "item_labor_phase", "read");

  if (!showCommercial) {
    return null;
  }

  return (
    <FormSection title="Commercial" width="full">
      {commercialReadable ? (
        <>
          <ItemCommercialRateField
            family="freight"
            label="Freight"
            options={freightOptions}
            catalogRows={freightRows}
            loading={freightRatesLoading}
            ancestorChain={ancestorChain}
            commercialIndex={commercialIndex}
            isChild={isChild}
            pathKey={marginPathKey}
            writable={commercialWritable}
            disabled={disabled}
          />
          <ItemCommercialRateField
            family="incidental"
            label="Incidental"
            options={incidentalOptions}
            catalogRows={incidentalRows}
            loading={incidentalRatesLoading}
            ancestorChain={ancestorChain}
            commercialIndex={commercialIndex}
            isChild={isChild}
            pathKey={marginPathKey}
            writable={commercialWritable}
            disabled={disabled}
          />
          <ItemCommercialRateField
            family="markup"
            label="Markup"
            options={markupOptions}
            catalogRows={markupRows}
            loading={markupTypesLoading}
            ancestorChain={ancestorChain}
            commercialIndex={commercialIndex}
            isChild={isChild}
            pathKey={marginPathKey}
            writable={commercialWritable}
            disabled={disabled}
          />
        </>
      ) : null}

      {showLeafLabor && commercialReadable ? (
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
                disabled={disabled || !commercialWritable}
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

      {(showCategoryLabor || showLeafLabor) &&
      fieldAllows(manifest, "item_labor_phase", "read") ? (
        <FieldControl manifest={manifest} field="item_labor_phase">
          <ItemLaborPhaseSection
            laborPhaseOptions={laborPhaseOptions}
            laborRateOptions={laborRateOptions}
            pickerLoading={pickerLoading}
            writable={laborPhaseWritable}
          />
        </FieldControl>
      ) : null}
    </FormSection>
  );
};
