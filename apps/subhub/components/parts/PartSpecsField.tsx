"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { FieldControl } from "@latch/react";
import {
  Checkbox,
  InputNumber,
  Popover,
  Select,
  Skeleton,
  Table,
  Typography,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { FormSection } from "@/components/form/FormSection";
import { usePartSpecDefsPicker } from "@/lib/hooks/use-part-spec-defs-picker";
import {
  collapsePartSpecRows,
  mergePartSpecsWithDefs,
  partSpecRowsEqual,
  type PartSpecFormRow,
} from "@/lib/parts/part-specs-form";
import type { PartSpecDefPickerRow } from "@/lib/surface-api";

export type { PartSpecFormRow } from "@/lib/parts/part-specs-form";

export type PartSpecsFormValues = {
  item_links: Array<{ item_id: string }>;
  part_specs: PartSpecFormRow[];
};

type PartSpecsFieldProps = {
  manifest: Manifest;
  /** Bumps when server detail hydrates so merge re-runs after form.reset. */
  syncKey?: string;
};

const enumOptionLabels = (
  optionIds: string[],
  def: PartSpecDefPickerRow | undefined,
): string => {
  if (optionIds.length === 0) {
    return "—";
  }

  return optionIds
    .map(
      (id) => def?.options.find((option) => option.id === id)?.display_name ?? id,
    )
    .join(", ");
};

const formatNumberDisplay = (
  value: number | null | undefined,
  def: PartSpecDefPickerRow,
): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  const formatted =
    def.decimal_places != null ? value.toFixed(def.decimal_places) : String(value);

  return def.unit_symbol ? `${formatted} ${def.unit_symbol}` : formatted;
};

const formatNumberValueSummary = (
  row: PartSpecFormRow | undefined,
  def: PartSpecDefPickerRow,
): string => {
  const hasMin = row?.value_number !== null && row?.value_number !== undefined;
  const hasMax =
    row?.value_number_max !== null && row?.value_number_max !== undefined;

  if (!hasMin && !hasMax) {
    return "Set value…";
  }

  if (hasMax) {
    const min = formatNumberDisplay(row?.value_number, def);
    const max = formatNumberDisplay(row?.value_number_max, def);
    if (min === "—" && max === "—") {
      return "Set value…";
    }
    return `${min} – ${max}`;
  }

  return formatNumberDisplay(row?.value_number, def);
};

const NumberValuePopover = ({
  index,
  def,
  row,
  disabled,
}: {
  index: number;
  def: PartSpecDefPickerRow;
  row: PartSpecFormRow | undefined;
  disabled: boolean;
}) => {
  const { control } = useFormContext<PartSpecsFormValues>();
  const [open, setOpen] = useState(false);
  const summary = formatNumberValueSummary(row, def);

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 240 }}>
      <Controller
        control={control}
        name={`part_specs.${index}.value_number`}
        render={({ field, fieldState }) => (
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Value
            </Typography.Text>
            <InputNumber
              addonAfter={def.unit_symbol ?? undefined}
              disabled={disabled}
              placeholder="Min / exact"
              precision={def.decimal_places ?? undefined}
              status={fieldState.error ? "error" : undefined}
              style={{ width: "100%" }}
              value={field.value ?? null}
              onChange={(value) => field.onChange(value ?? null)}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name={`part_specs.${index}.value_number_max`}
        render={({ field, fieldState }) => (
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Max (optional)
            </Typography.Text>
            <InputNumber
              addonAfter={def.unit_symbol ?? undefined}
              disabled={disabled}
              placeholder="Empty = exact"
              precision={def.decimal_places ?? undefined}
              status={fieldState.error ? "error" : undefined}
              style={{ width: "100%" }}
              value={field.value ?? null}
              onChange={(value) => field.onChange(value ?? null)}
            />
          </div>
        )}
      />
    </div>
  );

  return (
    <Popover
      content={content}
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      title="Number value"
    >
      <Typography.Link disabled={disabled && summary === "Set value…"}>
        {summary}
      </Typography.Link>
    </Popover>
  );
};

const SpecValueControl = ({
  index,
  def,
  row,
  writable,
  disabled,
}: {
  index: number;
  def: PartSpecDefPickerRow;
  row: PartSpecFormRow | undefined;
  writable: boolean;
  disabled: boolean;
}) => {
  const { control } = useFormContext<PartSpecsFormValues>();

  if (!writable) {
    if (def.value_type === "enum") {
      return (
        <Typography.Text>
          {enumOptionLabels(row?.spec_option_ids ?? [], def)}
        </Typography.Text>
      );
    }
    if (def.value_type === "boolean") {
      return (
        <Typography.Text>
          {row?.value_boolean === true
            ? "Yes"
            : row?.value_boolean === false
              ? "No"
              : "—"}
        </Typography.Text>
      );
    }
    if (def.value_type === "number") {
      const summary = formatNumberValueSummary(row, def);
      return (
        <Typography.Text>
          {summary === "Set value…" ? "—" : summary}
        </Typography.Text>
      );
    }
    return <Typography.Text>—</Typography.Text>;
  }

  if (def.value_type === "enum") {
    const options = def.options.map((option) => ({
      value: option.id,
      label: option.display_name,
    }));

    return (
      <Controller
        control={control}
        name={`part_specs.${index}.spec_option_ids`}
        render={({ field, fieldState }) => (
          <Select
            allowClear
            mode="multiple"
            size="small"
            style={{ width: "100%" }}
            placeholder="Compatible options (none = never matches)"
            options={options}
            value={Array.isArray(field.value) ? field.value : []}
            disabled={disabled}
            status={fieldState.error ? "error" : undefined}
            onChange={(optionIds) => field.onChange(optionIds ?? [])}
          />
        )}
      />
    );
  }

  if (def.value_type === "boolean") {
    return (
      <Controller
        control={control}
        name={`part_specs.${index}.value_boolean`}
        render={({ field }) => (
          <Checkbox
            checked={field.value === true}
            disabled={disabled}
            onChange={(event) => field.onChange(event.target.checked)}
          />
        )}
      />
    );
  }

  if (def.value_type === "number") {
    return (
      <NumberValuePopover
        def={def}
        disabled={disabled}
        index={index}
        row={row}
      />
    );
  }

  return <Typography.Text>—</Typography.Text>;
};

export const PartSpecsField = ({ manifest, syncKey }: PartSpecsFieldProps) => {
  const {
    control,
    getValues,
    setValue,
    formState: { dirtyFields },
  } = useFormContext<PartSpecsFormValues>();
  const partSpecs = useWatch({ control, name: "part_specs" }) ?? [];
  const itemLinks = useWatch({ control, name: "item_links" }) ?? [];
  const linksDirty = Boolean(dirtyFields.item_links);
  const serverSpecsRef = useRef<PartSpecFormRow[]>([]);
  const linkedItemIds = useMemo(
    () => itemLinks.map((row) => row.item_id).filter(Boolean),
    [itemLinks],
  );
  const linkedItemKey = linkedItemIds.join(",");

  const partSpecsSnapshotKey = useMemo(
    () =>
      JSON.stringify(
        partSpecs.map((row) => ({
          spec_def_id: row?.spec_def_id,
          spec_option_ids: row?.spec_option_ids,
          value_boolean: row?.value_boolean,
          value_number: row?.value_number,
          value_number_max: row?.value_number_max,
        })),
      ),
    [partSpecs],
  );

  const { data: defs, isLoading: defsLoading } = usePartSpecDefsPicker(
    linkedItemIds,
    linkedItemIds.length > 0,
  );

  const defsKey = useMemo(
    () => (defs ?? []).map((def) => def.spec_def_id).sort().join(","),
    [defs],
  );

  const displayRows = useMemo(() => {
    if (defsLoading || !defs || linkedItemIds.length === 0) {
      return [];
    }
    return mergePartSpecsWithDefs(partSpecs, defs);
  }, [defs, defsKey, defsLoading, linkedItemIds.length, partSpecs]);

  const staleServerSpecCount = useMemo(() => {
    if (!defs || defsLoading) {
      return 0;
    }
    const unionIds = new Set(defs.map((def) => def.spec_def_id));
    return collapsePartSpecRows(serverSpecsRef.current).filter(
      (row) => row.spec_def_id && !unionIds.has(row.spec_def_id),
    ).length;
  }, [defs, defsKey, defsLoading, syncKey, linkedItemKey]);

  const writable = fieldAllows(manifest, "part_specs", "write");

  useEffect(() => {
    serverSpecsRef.current = getValues("part_specs") ?? [];
  }, [getValues, syncKey]);

  useEffect(() => {
    if (defsLoading) {
      return;
    }

    if (linkedItemIds.length === 0) {
      const current = getValues("part_specs") ?? [];
      if (current.length > 0) {
        setValue("part_specs", [], { shouldDirty: linksDirty });
      }
      return;
    }

    if (!defs) {
      return;
    }

    const merged = mergePartSpecsWithDefs(getValues("part_specs") ?? [], defs);
    const current = getValues("part_specs") ?? [];
    if (!partSpecRowsEqual(merged, current)) {
      setValue("part_specs", merged, { shouldDirty: linksDirty });
    }
  }, [
    defs,
    defsKey,
    defsLoading,
    getValues,
    linkedItemIds.length,
    linkedItemKey,
    linksDirty,
    partSpecsSnapshotKey,
    setValue,
    syncKey,
  ]);

  const emptyState =
    linkedItemIds.length === 0 ? (
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Link items first — compatibility specs appear for each effective definition on
        the linked items.
      </Typography.Paragraph>
    ) : defsLoading ? null : (defs?.length ?? 0) === 0 ? (
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        No spec definitions apply to the linked items.
      </Typography.Paragraph>
    ) : null;

  return (
    <FieldControl manifest={manifest} field="part_specs">
      <FormSection title="Compatibility specs">
        {linksDirty ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
            Item links changed — compatibility specs will update when you save.
          </Typography.Paragraph>
        ) : null}
        {staleServerSpecCount > 0 ? (
          <Typography.Paragraph type="warning" style={{ marginBottom: 12 }}>
            {staleServerSpecCount} saved compatibility spec
            {staleServerSpecCount === 1 ? "" : "s"} no longer apply to the linked items —
            save to remove {staleServerSpecCount === 1 ? "it" : "them"}.
          </Typography.Paragraph>
        ) : null}
        {emptyState}
        {linkedItemIds.length > 0 && (defsLoading || (defs?.length ?? 0) > 0) ? (
          <Table
            size="small"
            pagination={false}
            rowKey={(row) => row.spec_def_id}
            dataSource={displayRows}
            columns={[
              {
                key: "spec",
                title: "Spec",
                width: "40%",
                render: (_value, row) => {
                  const def = defs?.find((entry) => entry.spec_def_id === row.spec_def_id);
                  if (defsLoading || !def) {
                    return <Skeleton.Input active size="small" block />;
                  }

                  return (
                    <div>
                      <Typography.Text>{def.display_name}</Typography.Text>
                      <Typography.Text
                        type="secondary"
                        style={{ display: "block", fontSize: 12 }}
                      >
                        {def.value_type}
                      </Typography.Text>
                    </div>
                  );
                },
              },
              {
                key: "value",
                title: "Value",
                render: (_value, row, index) => {
                  const def = defs?.find((entry) => entry.spec_def_id === row.spec_def_id);
                  if (defsLoading || !def) {
                    return <Skeleton.Input active size="small" block />;
                  }

                  return (
                    <SpecValueControl
                      index={index}
                      def={def}
                      row={row}
                      writable={writable}
                      disabled={!writable}
                    />
                  );
                },
              },
            ]}
          />
        ) : null}
      </FormSection>
    </FieldControl>
  );
};
