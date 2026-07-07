"use client";

import { fieldAllows, type Manifest } from "@latch/contracts";
import { Input, Typography } from "antd";
import { useMemo } from "react";
import { Controller, type FieldPath } from "react-hook-form";

import { CatalogTableSurface } from "@/components/catalog/CatalogTableSurface";
import type { FieldArrayTableColumn } from "@/components/form/FieldArrayTable";
import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { patchSurfaceList } from "@/lib/surface-api";

type SiteContactRelationCatalogProps = {
  manifest: Manifest;
};

type RelationFormRow = {
  client_key?: string;
  display_name: string;
  id?: string;
  sort_order: number;
};

type RelationFormValues = {
  rows: RelationFormRow[];
};

const mapRows = (
  rows: Array<Record<string, unknown>> | undefined,
): RelationFormRow[] =>
  (rows ?? []).map((row, index) => {
    const displayName = row.display_name as
      | { display_name?: string }
      | undefined;

    return {
      id: String(row.id),
      display_name: displayName?.display_name ?? "",
      sort_order: index + 1,
    };
  });

const orderSignature = (rows: RelationFormRow[]): string =>
  rows.map((row) => row.id ?? row.client_key ?? "").join("\0");

const DisplayNameCell = ({
  index,
  writable,
  disabled,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
}) => (
  <Controller<RelationFormValues>
    name={`rows.${index}.display_name` as FieldPath<RelationFormValues>}
    render={({ field: { value, onChange, onBlur } }) => {
      const text = typeof value === "string" ? value : "";

      return writable ? (
        <Input
          value={text}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
        />
      ) : (
        <Typography.Text>{text}</Typography.Text>
      );
    }}
  />
);

const RELATION_COLUMNS: FieldArrayTableColumn<
  RelationFormValues,
  "rows"
>[] = [
  {
    key: "display_name",
    title: "Display name",
    render: ({ index, writable, disabled }) => (
      <DisplayNameCell index={index} writable={writable} disabled={disabled} />
    ),
  },
];

export const SiteContactRelationCatalog = ({
  manifest: initialManifest,
}: SiteContactRelationCatalogProps) => {
  const { data, isLoading, error, refetch } = useSurfaceList(
    "site_contact_relation_table",
  );

  const activeManifest = data?.manifest ?? initialManifest;
  const defaultRows = useMemo(
    () => mapRows(data?.data.rows),
    [data?.data.rows],
  );
  const resetKey = data?.data.rows?.length ?? 0;

  const displayNameWritable = fieldAllows(activeManifest, "display_name", "write");
  const orderable = fieldAllows(activeManifest, "sort_order", "write");

  const columns = useMemo(() => {
    if (displayNameWritable || fieldAllows(activeManifest, "display_name", "read")) {
      return RELATION_COLUMNS;
    }
    return [];
  }, [activeManifest, displayNameWritable]);

  const saveRows = async (rows: RelationFormRow[]) => {
    await patchSurfaceList("site_contact_relation_table", {
      rows: rows.map((row) => ({
        ...(row.id ? { id: row.id } : {}),
        display_name: row.display_name,
      })),
    });
    await refetch();
  };

  if (error) {
    return (
      <Typography.Text type="danger">Unable to load site relations.</Typography.Text>
    );
  }

  return (
    <CatalogTableSurface<RelationFormValues, "rows", RelationFormRow>
      manifest={activeManifest}
      field="display_name"
      name="rows"
      columns={columns}
      createRow={() => ({
        client_key: crypto.randomUUID(),
        display_name: "",
        sort_order: defaultRows.length + 1,
      })}
      addLabel="Add relation"
      orderable={orderable}
      defaultRows={defaultRows}
      resetKey={`${resetKey}:${JSON.stringify(data?.data.rows ?? [])}`}
      loading={isLoading}
      onSave={saveRows}
      orderSignature={orderSignature}
    />
  );
};
