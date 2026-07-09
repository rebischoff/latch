"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { Input, Select, Typography } from "antd";
import { useMemo } from "react";
import { Controller, useFormContext, type FieldPath } from "react-hook-form";

import { CatalogTableSurface } from "@/components/catalog/CatalogTableSurface";
import type { FieldArrayTableColumn } from "@/components/form/FieldArrayTable";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { patchSurfaceList } from "@/lib/surface-api";

type SpecUnitTableProps = {
  manifest: Manifest;
};

type SpecUnitFormRow = {
  canonical_unit_id: string | null;
  client_key?: string;
  dimension: string;
  id?: string;
  name: string;
  sort_order: number;
  symbol: string;
  to_canonical_factor: number;
};

type SpecUnitFormValues = {
  rows: SpecUnitFormRow[];
};

const unwrapString = (row: Record<string, unknown>, key: string): string => {
  const field = row[key] as Record<string, string> | undefined;
  return field?.[key] ?? "";
};

const unwrapNullableString = (
  row: Record<string, unknown>,
  key: string,
): string | null => {
  const field = row[key] as Record<string, string | null> | undefined;
  const value = field?.[key];
  return value === undefined || value === "" ? null : value;
};

const unwrapNumber = (row: Record<string, unknown>, key: string): number => {
  const field = row[key] as Record<string, number> | undefined;
  return Number(field?.[key] ?? 0);
};

const mapRows = (rows: Array<Record<string, unknown>> | undefined): SpecUnitFormRow[] =>
  (rows ?? []).map((row, index) => ({
    id: String(row.id),
    symbol: unwrapString(row, "symbol"),
    name: (row.name as { name?: string } | undefined)?.name ?? "",
    dimension: unwrapString(row, "dimension"),
    canonical_unit_id: unwrapNullableString(row, "canonical_unit_id"),
    to_canonical_factor: unwrapNumber(row, "to_canonical_factor") || 1,
    sort_order: index + 1,
  }));

const orderSignature = (rows: SpecUnitFormRow[]): string =>
  rows.map((row) => row.id ?? row.client_key ?? "").join("\0");

type CanonicalUnitSelectProps = {
  disabled: boolean;
  index: number;
  optionsByDimension: Map<string, Array<{ value: string; label: string }>>;
  writable: boolean;
};

const CanonicalUnitSelect = ({
  index,
  writable,
  disabled,
  optionsByDimension,
}: CanonicalUnitSelectProps) => {
  const { control, watch } = useFormContext<SpecUnitFormValues>();
  const dimension = watch(`rows.${index}.dimension`) ?? "";
  const options = optionsByDimension.get(dimension) ?? [];

  return (
    <Controller<SpecUnitFormValues>
      name={`rows.${index}.canonical_unit_id` as FieldPath<SpecUnitFormValues>}
      control={control}
      render={({ field }) => (
        <Select
          allowClear
          disabled={!writable || disabled}
          options={options}
          placeholder="(canonical)"
          style={{ width: "100%" }}
          value={field.value ?? undefined}
          onChange={(value) => field.onChange(value ?? null)}
        />
      )}
    />
  );
};

export const SpecUnitTable = ({ manifest: initialManifest }: SpecUnitTableProps) => {
  const { data, isLoading, error, refetch } = useSurfaceList("spec_unit_table");
  const activeManifest = data?.manifest ?? initialManifest;
  const defaultRows = useMemo(() => mapRows(data?.data.rows), [data?.data.rows]);
  const allRows = defaultRows;

  const canonicalOptionsByDimension = useMemo(() => {
    const byDimension = new Map<string, Array<{ value: string; label: string }>>();
    for (const row of allRows) {
      if (row.canonical_unit_id !== null) {
        continue;
      }
      const options = byDimension.get(row.dimension) ?? [];
      options.push({ value: row.id!, label: `${row.symbol} — ${row.name}` });
      byDimension.set(row.dimension, options);
    }
    return byDimension;
  }, [allRows]);

  const columns = useMemo((): FieldArrayTableColumn<SpecUnitFormValues, "rows">[] => {
    const result: FieldArrayTableColumn<SpecUnitFormValues, "rows">[] = [
      {
        key: "symbol",
        title: "Symbol",
        width: 100,
        render: ({ index, writable, disabled }) => (
          <Controller<SpecUnitFormValues>
            name={`rows.${index}.symbol` as FieldPath<SpecUnitFormValues>}
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={typeof value === "string" ? value : ""}
                onChange={onChange}
                onBlur={onBlur}
                disabled={!writable || disabled}
                placeholder="A"
              />
            )}
          />
        ),
      },
      {
        key: "name",
        title: "Name",
        width: 200,
        render: ({ index, writable, disabled }) => (
          <Controller<SpecUnitFormValues>
            name={`rows.${index}.name` as FieldPath<SpecUnitFormValues>}
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={typeof value === "string" ? value : ""}
                onChange={onChange}
                onBlur={onBlur}
                disabled={!writable || disabled}
                placeholder="Ampere"
              />
            )}
          />
        ),
      },
      {
        key: "dimension",
        title: "Dimension",
        width: 140,
        render: ({ index, writable, disabled }) => (
          <Controller<SpecUnitFormValues>
            name={`rows.${index}.dimension` as FieldPath<SpecUnitFormValues>}
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={typeof value === "string" ? value : ""}
                onChange={onChange}
                onBlur={onBlur}
                disabled={!writable || disabled}
                placeholder="current"
              />
            )}
          />
        ),
      },
      {
        key: "canonical_unit_id",
        title: "Canonical unit",
        width: 200,
        render: ({ index, writable, disabled }) => (
          <CanonicalUnitSelect
            index={index}
            writable={writable}
            disabled={disabled}
            optionsByDimension={canonicalOptionsByDimension}
          />
        ),
      },
      {
        key: "to_canonical_factor",
        title: "Factor",
        width: 120,
        render: ({ index, writable, disabled }) => (
          <Controller<SpecUnitFormValues>
            name={`rows.${index}.to_canonical_factor` as FieldPath<SpecUnitFormValues>}
            render={({ field }) => (
              <Input
                type="number"
                disabled={!writable || disabled}
                value={String(field.value ?? 1)}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        ),
      },
    ];

    return result;
  }, [canonicalOptionsByDimension]);

  const saveRows = async (rows: SpecUnitFormRow[]) => {
    await patchSurfaceList("spec_unit_table", {
      rows: rows.map((row) => ({
        ...(row.id ? { id: row.id } : {}),
        symbol: row.symbol,
        name: row.name,
        dimension: row.dimension,
        canonical_unit_id: row.canonical_unit_id,
        to_canonical_factor: row.to_canonical_factor,
      })),
    });
    await refetch();
  };

  if (error) {
    return (
      <Typography.Text type="danger">Unable to load spec units.</Typography.Text>
    );
  }

  if (!fieldAllows(activeManifest, "symbol", "read")) {
    return null;
  }

  return (
    <CatalogTableSurface<SpecUnitFormValues, "rows", SpecUnitFormRow>
      manifest={activeManifest}
      field="symbol"
      name="rows"
      columns={columns}
      orderable={fieldAllows(activeManifest, "symbol", "write")}
      addLabel="Add unit"
      defaultRows={defaultRows}
      resetKey={data?.data.rows}
      loading={isLoading}
      onSave={saveRows}
      orderSignature={orderSignature}
      createRow={() => ({
        symbol: "",
        name: "",
        dimension: "",
        canonical_unit_id: null,
        to_canonical_factor: 1,
        sort_order: defaultRows.length + 1,
      })}
    />
  );
};
