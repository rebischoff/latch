"use client";

import { fieldAllows, type Manifest, type SurfaceId } from "@latch/contracts";
import { Input, Typography } from "antd";
import { useMemo } from "react";
import { Controller, type FieldPath } from "react-hook-form";

import { CatalogTableSurface } from "@/components/catalog/CatalogTableSurface";
import type { FieldArrayTableColumn } from "@/components/form/FieldArrayTable";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { patchSurfaceList } from "@/lib/surface-api";

type CatalogColumnKey = "name" | "rate_cents" | "percent" | "amount_cents" | "factor_percent" | "material_markup_percent" | "labor_markup_percent";

type CommercialCatalogTableProps = {
  columns: CatalogColumnKey[];
  field: string;
  manifest: Manifest;
  surfaceId: SurfaceId;
  title?: string;
};

type CatalogFormRow = {
  amount_cents?: number;
  client_key?: string;
  factor_percent?: number;
  id?: string;
  labor_markup_percent?: number;
  material_markup_percent?: number;
  name: string;
  percent?: number;
  rate_cents?: number;
  sort_order: number;
};

type CatalogFormValues = {
  rows: CatalogFormRow[];
};

const unwrapName = (row: Record<string, unknown>): string => {
  const nameField = row.name as { name?: string } | undefined;
  return nameField?.name ?? "";
};

const unwrapNumber = (
  row: Record<string, unknown>,
  key: string,
): number | undefined => {
  const field = row[key] as Record<string, number> | undefined;
  const value = field?.[key];
  return value === undefined ? undefined : Number(value);
};

const centsToDollars = (cents: number): number => cents / 100;

const dollarsToCents = (dollars: number): number => Math.round(dollars * 100);

const mapRows = (
  rows: Array<Record<string, unknown>> | undefined,
  columns: CatalogColumnKey[],
): CatalogFormRow[] =>
  (rows ?? []).map((row, index) => ({
    id: String(row.id),
    name: unwrapName(row),
    sort_order: index + 1,
    ...(columns.includes("rate_cents")
      ? { rate_cents: centsToDollars(unwrapNumber(row, "rate_cents") ?? 0) }
      : {}),
    ...(columns.includes("percent")
      ? { percent: unwrapNumber(row, "percent") ?? 0 }
      : {}),
    ...(columns.includes("amount_cents")
      ? { amount_cents: centsToDollars(unwrapNumber(row, "amount_cents") ?? 0) }
      : {}),
    ...(columns.includes("factor_percent")
      ? { factor_percent: unwrapNumber(row, "factor_percent") ?? 100 }
      : {}),
    ...(columns.includes("material_markup_percent")
      ? { material_markup_percent: unwrapNumber(row, "material_markup_percent") ?? 0 }
      : {}),
    ...(columns.includes("labor_markup_percent")
      ? { labor_markup_percent: unwrapNumber(row, "labor_markup_percent") ?? 0 }
      : {}),
  }));

const orderSignature = (rows: CatalogFormRow[]): string =>
  rows.map((row) => row.id ?? row.client_key ?? "").join("\0");

const columnTitle: Record<CatalogColumnKey, string> = {
  name: "Name",
  rate_cents: "Rate / hr ($)",
  percent: "Percent",
  amount_cents: "Amount ($)",
  factor_percent: "Factor %",
  material_markup_percent: "Material markup %",
  labor_markup_percent: "Labor markup %",
};

export const CommercialCatalogTable = ({
  surfaceId,
  manifest: initialManifest,
  field,
  columns,
}: CommercialCatalogTableProps) => {
  const { data, isLoading, error, refetch } = useSurfaceList(surfaceId);
  const activeManifest = data?.manifest ?? initialManifest;
  const defaultRows = useMemo(
    () => mapRows(data?.data.rows, columns),
    [columns, data?.data.rows],
  );

  const tableColumns = useMemo((): FieldArrayTableColumn<CatalogFormValues, "rows">[] => {
    const result: FieldArrayTableColumn<CatalogFormValues, "rows">[] = [];

    if (columns.includes("name")) {
      result.push({
        key: "name",
        title: columnTitle.name,
        render: ({ index, writable, disabled }) => (
          <Controller<CatalogFormValues>
            name={`rows.${index}.name` as FieldPath<CatalogFormValues>}
            render={({ field: { value, onChange, onBlur } }) =>
              writable ? (
                <Input
                  value={typeof value === "string" ? value : ""}
                  onChange={onChange}
                  onBlur={onBlur}
                  disabled={disabled}
                />
              ) : (
                <Typography.Text>{typeof value === "string" ? value : ""}</Typography.Text>
              )
            }
          />
        ),
      });
    }

    for (const key of columns.filter((column) => column !== "name")) {
      result.push({
        key,
        title: columnTitle[key],
        render: ({ index, writable, disabled }) => (
          <Controller<CatalogFormValues>
            name={`rows.${index}.${key}` as FieldPath<CatalogFormValues>}
            render={({ field: controllerField }) =>
              writable ? (
                <Input
                  type="number"
                  value={String(controllerField.value ?? 0)}
                  onChange={(event) =>
                    controllerField.onChange(Number(event.target.value))
                  }
                  disabled={disabled}
                />
              ) : (
                <Typography.Text>{String(controllerField.value ?? "")}</Typography.Text>
              )
            }
          />
        ),
      });
    }

    return result;
  }, [columns]);

  const saveRows = async (rows: CatalogFormRow[]) => {
    await patchSurfaceList(surfaceId, {
      rows: rows.map((row) => ({
        ...(row.id ? { id: row.id } : {}),
        name: row.name,
        ...(row.rate_cents !== undefined
          ? { rate_cents: dollarsToCents(row.rate_cents) }
          : {}),
        ...(row.percent !== undefined ? { percent: row.percent } : {}),
        ...(row.amount_cents !== undefined
          ? { amount_cents: dollarsToCents(row.amount_cents) }
          : {}),
        ...(row.factor_percent !== undefined ? { factor_percent: row.factor_percent } : {}),
        ...(row.material_markup_percent !== undefined
          ? { material_markup_percent: row.material_markup_percent }
          : {}),
        ...(row.labor_markup_percent !== undefined
          ? { labor_markup_percent: row.labor_markup_percent }
          : {}),
      })),
    });
    await refetch();
  };

  if (error) {
    return (
      <Typography.Text type="danger">Unable to load catalog table.</Typography.Text>
    );
  }

  return (
    <CatalogTableSurface<CatalogFormValues, "rows", CatalogFormRow>
      manifest={activeManifest}
      field={field}
      name="rows"
      columns={tableColumns}
      createRow={() => ({
        client_key: crypto.randomUUID(),
        name: "",
        sort_order: defaultRows.length + 1,
      })}
      addLabel="Add row"
      orderable={fieldAllows(activeManifest, "sort_order", "write")}
      defaultRows={defaultRows}
      resetKey={`${defaultRows.length}:${JSON.stringify(data?.data.rows ?? [])}`}
      loading={isLoading}
      onSave={saveRows}
      orderSignature={orderSignature}
    />
  );
};
