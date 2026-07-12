"use client";

import {
  fieldAllows,
  patchableFieldIds,
  surfaceAllows,
  type FieldId,
  type Manifest,
} from "@latch/contracts";
import { App } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useForm,
  type ArrayPath,
  type DefaultValues,
  type FieldArray,
  type FieldValues,
  type Path,
} from "react-hook-form";

import {
  FieldArrayTable,
  type FieldArrayTableColumn,
} from "@/components/form/FieldArrayTable";
import { TABLE_WIDTH_LG } from "@/components/form/formLayout";
import { useRegisterSurfaceActions } from "@/components/shell/SurfaceActionsProvider";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { SurfaceApiError } from "@/lib/surface-api";

type CatalogTableSurfaceProps<
  TForm extends FieldValues,
  TName extends ArrayPath<TForm>,
  TRow extends FieldArray<TForm, TName>,
> = {
  manifest: Manifest;
  field: FieldId;
  name: TName;
  columns: FieldArrayTableColumn<TForm, TName>[];
  createRow: () => TRow;
  addLabel?: string;
  orderable?: boolean;
  /** Cap the catalog table; default TABLE_WIDTH_LG. */
  maxWidth?: number;
  defaultRows: TRow[];
  resetKey: unknown;
  loading: boolean;
  onSave: (rows: TRow[]) => Promise<void>;
  orderSignature?: (rows: TRow[]) => string;
  children?: ReactNode;
};

export const CatalogTableSurface = <
  TForm extends FieldValues,
  TName extends ArrayPath<TForm>,
  TRow extends FieldArray<TForm, TName>,
>({
  manifest,
  field,
  name,
  columns,
  createRow,
  addLabel,
  orderable = false,
  maxWidth = TABLE_WIDTH_LG,
  defaultRows,
  resetKey,
  loading,
  onSave,
  orderSignature,
  children,
}: CatalogTableSurfaceProps<TForm, TName, TRow>) => {
  const { message } = App.useApp();
  const [savePending, setSavePending] = useState(false);

  const defaultValues = useMemo(
    () => ({ [name]: defaultRows }) as DefaultValues<TForm>,
    [defaultRows, name],
  );

  const signature = useCallback(
    (rows: TRow[]) =>
      orderSignature?.(rows) ??
      rows.map((row) => String((row as { id?: string }).id ?? "")).join("\0"),
    [orderSignature],
  );

  const [loadedOrder, setLoadedOrder] = useState(() => signature(defaultRows));

  useEffect(() => {
    setLoadedOrder(signature(defaultRows));
  }, [defaultRows, resetKey, signature]);

  const form = useForm<TForm>({
    defaultValues,
  });

  const {
    formState: { isDirty },
    reset,
    watch,
  } = form;

  const watchedRows = (watch(name as Path<TForm>) ?? defaultRows) as TRow[];
  const orderDirty = signature(watchedRows) !== loadedOrder;
  const dirty = isDirty || orderDirty;

  const canSurfaceWrite = surfaceAllows(manifest, "write");
  const canWrite =
    canSurfaceWrite && patchableFieldIds(manifest).length > 0;
  const allowAdd = canSurfaceWrite && fieldAllows(manifest, field, "write");
  const allowRemove = surfaceAllows(manifest, "delete");
  const saving = savePending;

  const submit = form.handleSubmit(async (values) => {
    setSavePending(true);
    try {
      const rows = values[name as Path<TForm>] as TRow[];
      await onSave(rows);
      setLoadedOrder(signature(rows));
      reset({ [name]: rows } as DefaultValues<TForm>);
      message.success("Saved");
    } catch (err) {
      const detail =
        err instanceof SurfaceApiError ? err.message : "Unable to save";
      message.error(detail);
    } finally {
      setSavePending(false);
    }
  });

  const onRevert = () => {
    reset(defaultValues);
    setLoadedOrder(signature(defaultRows));
    message.info("Reverted to last loaded values");
  };

  const toolbarActions = useMemo(
    () => [
      {
        key: "save",
        label: "Save",
        priority: "primary" as const,
        surfaceAction: "write" as const,
        disabled: !canWrite || !dirty,
        loading: saving,
        onClick: submit,
      },
      {
        key: "revert",
        label: "Revert",
        priority: "secondary" as const,
        surfaceAction: "write" as const,
        disabled: !dirty || saving,
        onClick: onRevert,
      },
    ],
    [canWrite, dirty, onRevert, saving, submit],
  );

  useRegisterSurfaceActions(manifest, toolbarActions);

  return (
    <SurfaceFormRoot
      manifest={manifest}
      loading={loading}
      blocking={saving}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={resetKey}
    >
      <form onSubmit={submit}>
        {children}
        <FieldArrayTable<TForm, TName>
          field={field}
          name={name}
          columns={columns}
          createRow={createRow}
          addLabel={addLabel}
          size="small"
          maxWidth={maxWidth}
          orderable={orderable && canSurfaceWrite}
          allowAdd={allowAdd}
          allowRemove={allowRemove}
        />
      </form>
    </SurfaceFormRoot>
  );
};
