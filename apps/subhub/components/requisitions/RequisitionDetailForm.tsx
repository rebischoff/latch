"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldAllows,
  narrowPatchSchema,
  patchableFieldIds,
  surfaceAllows,
  type Manifest,
} from "@latch/contracts";
import { App, Button, Input, InputNumber, Modal, Tag, Typography } from "antd";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
  type FieldPath,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";

import {
  FieldArrayTable,
  type FieldArrayTableColumn,
} from "@/components/form/FieldArrayTable";
import { FormFieldItem } from "@/components/form/FormFieldItem";
import { FormSection } from "@/components/form/FormSection";
import {
  LinkedSelectControl,
  LinkedSelectInput,
} from "@/components/form/LinkedSelectInput";
import { TextInput } from "@/components/form/TextInput";
import { DetailHeader } from "@/components/surface/DetailHeader";
import { SurfaceFormLayout } from "@/components/surface/SurfaceFormLayout";
import { SurfaceFormRoot } from "@/components/surface/SurfaceFormRoot";
import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { useSurfaceListCreate } from "@/lib/hooks/use-surface-list-create";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete, useSurfacePatch } from "@/lib/hooks/use-surface-patch";
import { useRequisitionBomPool } from "@/lib/hooks/use-requisition-bom-pool";
import { useRequisitionJobPicker } from "@/lib/hooks/use-requisition-job-picker";
import {
  RequestedOrderDetailCreateSchema,
  RequestedOrderDetailPatchSchema,
} from "@/lib/requested-orders/descriptors/requested-order-detail";
import { routes } from "@/lib/nav-routes";
import { navigateOnCancel } from "@/lib/surface-navigation";
import { SurfaceApiError, type RequisitionBomPoolRow } from "@/lib/surface-api";

const FROZEN_STATUSES = new Set(["on_purchase_order", "fulfilled"]);

const STATUS_COLORS: Record<string, string> = {
  open: "default",
  on_purchase_order: "processing",
  fulfilled: "success",
  withdrawn: "error",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  on_purchase_order: "On PO",
  fulfilled: "Fulfilled",
  withdrawn: "Withdrawn",
};

type RequisitionLineFormRow = {
  id?: string;
  job_line_part_id?: string | null;
  part_id?: string | null;
  description: string;
  quantity: number;
  unit: string;
  status: string;
  withdrawal_note: string;
  part_mpn?: string | null;
  part_description?: string | null;
  purchase_order_number?: string | null;
  purchase_order_status?: string | null;
};

type RequisitionDetailFormValues = {
  profile: {
    job_id: string;
    note: string;
  };
  line_items: RequisitionLineFormRow[];
};

const lineLabel = (row: RequisitionLineFormRow): string => {
  if (row.job_line_part_id) {
    return row.part_mpn ?? row.part_description ?? (row.description || "BOM part");
  }
  return row.description || row.part_id || "Ad-hoc line";
};

const mapLineItems = (rows: unknown): RequisitionLineFormRow[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: typeof item.id === "string" ? item.id : undefined,
      job_line_part_id: (item.job_line_part_id as string | null) ?? null,
      part_id: (item.part_id as string | null) ?? null,
      description: typeof item.description === "string" ? item.description : "",
      quantity:
        typeof item.quantity === "number" ? item.quantity : Number(item.quantity ?? 1),
      unit: typeof item.unit === "string" ? item.unit : "ea",
      status: typeof item.status === "string" ? item.status : "open",
      withdrawal_note:
        typeof item.withdrawal_note === "string" ? item.withdrawal_note : "",
      part_mpn: (item.part_mpn as string | null) ?? null,
      part_description: (item.part_description as string | null) ?? null,
      purchase_order_number: (item.purchase_order_number as string | null) ?? null,
      purchase_order_status: (item.purchase_order_status as string | null) ?? null,
    };
  });
};

const buildDefaultValues = (
  data: Record<string, unknown> | undefined,
  isCreate: boolean,
  initialJobId: string | undefined,
): RequisitionDetailFormValues => {
  if (isCreate) {
    return {
      profile: { job_id: initialJobId ?? "", note: "" },
      line_items: [],
    };
  }

  const profile = data?.profile as
    | { job_id?: string | null; note?: string | null }
    | undefined;

  return {
    profile: {
      job_id: profile?.job_id ?? "",
      note: profile?.note ?? "",
    },
    line_items: mapLineItems(data?.line_items),
  };
};

const jobPickerOptions = (
  rows: Array<{ id: string; title: string }> | undefined,
): Array<{ value: string; label: string }> =>
  rows?.map((row) => ({ value: row.id, label: row.title })) ?? [];

type WithdrawButtonProps = {
  index: number;
  disabled: boolean;
};

const WithdrawButton = ({ index, disabled }: WithdrawButtonProps) => {
  const { setValue, getValues } = useFormContext<RequisitionDetailFormValues>();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const onConfirm = () => {
    if (!note.trim()) {
      return;
    }
    setValue(`line_items.${index}.status`, "withdrawn", { shouldDirty: true });
    setValue(`line_items.${index}.withdrawal_note`, note.trim(), { shouldDirty: true });
    setOpen(false);
    setNote("");
  };

  return (
    <>
      <Button
        size="small"
        danger
        disabled={disabled}
        onClick={() => {
          setNote(getValues(`line_items.${index}.withdrawal_note`) ?? "");
          setOpen(true);
        }}
      >
        Withdraw
      </Button>
      <Modal
        title="Withdraw line"
        open={open}
        onOk={onConfirm}
        onCancel={() => setOpen(false)}
        okButtonProps={{ disabled: !note.trim() }}
        okText="Withdraw"
      >
        <Typography.Paragraph type="secondary">
          A withdrawal note is required.
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Why is this line being withdrawn?"
        />
      </Modal>
    </>
  );
};

const DescriptionCell = ({
  index,
  writable,
  disabled,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
}) => {
  const { watch } = useFormContext<RequisitionDetailFormValues>();
  const row = watch(`line_items.${index}`);
  const frozen = FROZEN_STATUSES.has(row?.status ?? "open");

  if (row?.job_line_part_id) {
    return <Typography.Text>{lineLabel(row)}</Typography.Text>;
  }

  return (
    <Controller<RequisitionDetailFormValues>
      name={`line_items.${index}.description` as FieldPath<RequisitionDetailFormValues>}
      render={({ field }) =>
        writable && !frozen ? (
          <Input
            {...field}
            value={typeof field.value === "string" ? field.value : ""}
            disabled={disabled}
            placeholder="Ad-hoc description"
          />
        ) : (
          <Typography.Text>{lineLabel(row)}</Typography.Text>
        )
      }
    />
  );
};

const QuantityCell = ({
  index,
  writable,
  disabled,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
}) => {
  const { watch } = useFormContext<RequisitionDetailFormValues>();
  const status = watch(`line_items.${index}.status`);
  const frozen = FROZEN_STATUSES.has(status ?? "open");

  return (
    <Controller<RequisitionDetailFormValues>
      name={`line_items.${index}.quantity` as FieldPath<RequisitionDetailFormValues>}
      render={({ field: { value, onChange } }) =>
        writable && !frozen ? (
          <InputNumber
            size="small"
            min={0.01}
            style={{ width: "100%" }}
            value={Number(value)}
            disabled={disabled}
            onChange={(next) => onChange(next ?? 0)}
          />
        ) : (
          <Typography.Text>{Number(value)}</Typography.Text>
        )
      }
    />
  );
};

const UnitCell = ({
  index,
  writable,
  disabled,
}: {
  index: number;
  writable: boolean;
  disabled: boolean;
}) => {
  const { watch } = useFormContext<RequisitionDetailFormValues>();
  const status = watch(`line_items.${index}.status`);
  const frozen = FROZEN_STATUSES.has(status ?? "open");

  return (
    <Controller<RequisitionDetailFormValues>
      name={`line_items.${index}.unit` as FieldPath<RequisitionDetailFormValues>}
      render={({ field }) =>
        writable && !frozen ? (
          <Input
            {...field}
            value={typeof field.value === "string" ? field.value : ""}
            disabled={disabled}
          />
        ) : (
          <Typography.Text>{String(field.value ?? "")}</Typography.Text>
        )
      }
    />
  );
};

const StatusCell = ({ index }: { index: number }) => {
  const { watch } = useFormContext<RequisitionDetailFormValues>();
  const status = watch(`line_items.${index}.status`) ?? "open";
  return <Tag color={STATUS_COLORS[status] ?? "default"}>{STATUS_LABELS[status] ?? status}</Tag>;
};

const PurchaseOrderCell = ({ index }: { index: number }) => {
  const { watch } = useFormContext<RequisitionDetailFormValues>();
  const poNumber = watch(`line_items.${index}.purchase_order_number`);
  return <Typography.Text type="secondary">{poNumber ?? "—"}</Typography.Text>;
};

type RequisitionDetailFormProps = {
  requisitionId: string;
  manifest: Manifest;
  initialJobId?: string;
  initialJobTitle?: string;
};

export const RequisitionDetailForm = ({
  requisitionId,
  manifest,
  initialJobId,
  initialJobTitle,
}: RequisitionDetailFormProps) => {
  const isCreate = requisitionId === "new";
  const router = useRouter();
  const { message, modal } = App.useApp();

  const { data: detail, isLoading, isFetching, error } = useSurfaceDetail(
    "requested_order_detail",
    isCreate ? undefined : requisitionId,
  );
  const { data: jobPicker, isLoading: jobPickerLoading } = useRequisitionJobPicker();

  const patch = useSurfacePatch("requested_order_detail", requisitionId);
  const create = useSurfaceListCreate("requested_order_list", "requested_order_detail");
  const remove = useSurfaceDelete("requested_order_detail", requisitionId);

  const activeManifest = detail?.manifest ?? manifest;
  const profile = detail?.data.profile as
    | {
        job_id?: string | null;
        job_title?: string | null;
        requested_by_display_name?: string | null;
        requested_at?: string | null;
        note?: string | null;
      }
    | undefined;

  const defaultValues = useMemo(
    () => buildDefaultValues(isCreate ? undefined : detail?.data, isCreate, initialJobId),
    [detail?.data, isCreate, initialJobId],
  );

  const resolver = useMemo(() => {
    const baseSchema = (
      isCreate ? RequestedOrderDetailCreateSchema : RequestedOrderDetailPatchSchema
    ) as z.ZodObject<z.ZodRawShape>;
    const narrowed = narrowPatchSchema(baseSchema, activeManifest) as z.ZodObject<
      z.ZodRawShape
    >;
    const loosened = narrowed.extend({
      line_items: z.array(z.object({}).passthrough()).optional(),
    });
    return zodResolver(loosened);
  }, [activeManifest, isCreate]);

  const form = useForm<RequisitionDetailFormValues>({
    resolver: resolver as unknown as Resolver<RequisitionDetailFormValues>,
    defaultValues,
  });

  const { watch } = form;
  const lineItemsArray = useFieldArray({ control: form.control, name: "line_items" });

  const jobId = watch("profile.job_id");
  const lineItems = watch("line_items") ?? [];
  const jobLocked = !isCreate || Boolean(initialJobId);

  const jobOptions = useMemo(() => {
    const options = jobPickerOptions(jobPicker?.data.rows);
    const currentId = jobId || profile?.job_id || initialJobId;
    const currentTitle = profile?.job_title ?? initialJobTitle;
    if (currentId && currentTitle && !options.some((option) => option.value === currentId)) {
      return [...options, { value: currentId, label: currentTitle }];
    }
    return options;
  }, [initialJobId, initialJobTitle, jobId, jobPicker?.data.rows, profile?.job_id, profile?.job_title]);

  const { data: bomPool, isLoading: bomPoolLoading } = useRequisitionBomPool(
    jobId || undefined,
  );

  const pickedJobLinePartIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of lineItems) {
      if (row.job_line_part_id) {
        ids.add(row.job_line_part_id);
      }
    }
    return ids;
  }, [lineItems]);

  const availableBomRows = useMemo(
    () => (bomPool?.data.rows ?? []).filter((row) => !pickedJobLinePartIds.has(row.job_line_part_id)),
    [bomPool?.data.rows, pickedJobLinePartIds],
  );

  const [bomQty, setBomQty] = useState<Record<string, number>>({});

  const addBomRow = useCallback(
    (row: RequisitionBomPoolRow) => {
      const qty = bomQty[row.job_line_part_id] ?? row.remaining;
      lineItemsArray.append({
        job_line_part_id: row.job_line_part_id,
        part_id: row.part_id,
        description: row.description,
        quantity: qty,
        unit: row.unit,
        status: "open",
        withdrawal_note: "",
        part_mpn: row.part_mpn,
        part_description: row.part_description,
        purchase_order_number: null,
        purchase_order_status: null,
      });
    },
    [bomQty, lineItemsArray],
  );

  const addAdhocRow = useCallback(() => {
    lineItemsArray.append({
      job_line_part_id: null,
      part_id: null,
      description: "",
      quantity: 1,
      unit: "ea",
      status: "open",
      withdrawal_note: "",
      purchase_order_number: null,
      purchase_order_status: null,
    });
  }, [lineItemsArray]);

  const {
    formState: { isDirty },
  } = form;

  const writable = fieldAllows(activeManifest, "line_items", "write");
  const canSave =
    patchableFieldIds(activeManifest).length > 0 && (!isCreate || Boolean(jobId));
  const saving = patch.isPending || create.isPending;

  const persistRequisition = useCallback(
    async (values: RequisitionDetailFormValues) => {
      const body: Record<string, unknown> = isCreate
        ? { profile: { job_id: values.profile.job_id, note: values.profile.note } }
        : { profile: { note: values.profile.note } };

      if (writable) {
        body.line_items = (values.line_items ?? []).map((row) => ({
          id: row.id,
          job_line_part_id: row.job_line_part_id ?? null,
          part_id: row.part_id ?? null,
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          status: row.status,
          withdrawal_note: row.withdrawal_note,
        }));
      }

      try {
        if (isCreate) {
          const result = await create.mutateAsync(body);
          const newId = String(result.data.id);
          message.success("Requisition created");
          router.replace(routes.requisitions.detail(newId));
          router.refresh();
          return;
        }

        await patch.mutateAsync(body);
        message.success("Requisition saved");
      } catch (saveError) {
        if (saveError instanceof SurfaceApiError) {
          const details = saveError.details as
            | { code?: string; job_line_part_id?: string; remaining?: number }
            | undefined;
          if (details?.code === "over_remaining") {
            message.error(
              `Quantity exceeds remaining need (remaining: ${details.remaining ?? 0})`,
            );
            return;
          }
          if (details?.code === "withdrawal_note_required") {
            message.error("A withdrawal note is required to withdraw a line");
            return;
          }
          if (details?.code === "line_frozen") {
            message.error("One or more lines are on a purchase order and cannot be edited");
            return;
          }
          message.error(saveError.message || "Unable to save requisition");
          return;
        }
        message.error(isCreate ? "Unable to create requisition" : "Unable to save requisition");
      }
    },
    [create, isCreate, message, patch, router, writable],
  );

  const onSave = form.handleSubmit(persistRequisition);

  const onCancel = useCallback(() => {
    const navigate = () => navigateOnCancel(router, null, routes.requisitions.list);
    if (isDirty) {
      modal.confirm({
        title: "Leave without saving?",
        content: "Unsaved changes will be lost.",
        okText: "Leave",
        onOk: navigate,
      });
      return;
    }
    navigate();
  }, [isDirty, modal, router]);

  const onRevert = useCallback(() => {
    form.reset(defaultValues);
    message.info("Reverted to last loaded values");
  }, [defaultValues, form, message]);

  const canDelete =
    !isCreate &&
    surfaceAllows(activeManifest, "delete") &&
    lineItems.every((row) => !FROZEN_STATUSES.has(row.status));

  const onDelete = useCallback(() => {
    modal.confirm({
      title: "Delete requisition?",
      content: "This cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success("Requisition deleted");
          router.push(routes.requisitions.list);
          router.refresh();
        } catch (deleteError) {
          if (deleteError instanceof SurfaceApiError) {
            message.error(deleteError.message || "Unable to delete requisition");
            return;
          }
          message.error("Unable to delete requisition");
        }
      },
    });
  }, [message, modal, remove, router]);

  useSurfaceFormChrome({
    mode: isCreate ? "create" : "edit",
    manifest: activeManifest,
    canSave,
    saving,
    onSave,
    isDirty,
    canDelete,
    onDelete: isCreate ? undefined : onDelete,
    onRevert: isCreate ? undefined : onRevert,
    onCancel: isCreate ? onCancel : undefined,
  });

  if (!isCreate && error instanceof SurfaceApiError && error.status === 404) {
    notFound();
  }

  const initialLoading = !isCreate && isLoading && !detail;
  const blocking = !isCreate && isFetching && Boolean(detail);

  const lineColumns = useMemo<
    FieldArrayTableColumn<RequisitionDetailFormValues, "line_items">[]
  >(
    () => [
      {
        key: "description",
        title: "Part / description",
        render: ({ index, writable: rowWritable, disabled }) => (
          <DescriptionCell index={index} writable={rowWritable} disabled={disabled} />
        ),
      },
      {
        key: "quantity",
        title: "Qty",
        width: 100,
        render: ({ index, writable: rowWritable, disabled }) => (
          <QuantityCell index={index} writable={rowWritable} disabled={disabled} />
        ),
      },
      {
        key: "unit",
        title: "Unit",
        width: 80,
        render: ({ index, writable: rowWritable, disabled }) => (
          <UnitCell index={index} writable={rowWritable} disabled={disabled} />
        ),
      },
      {
        key: "status",
        title: "Status",
        width: 130,
        render: ({ index }) => <StatusCell index={index} />,
      },
      {
        key: "po",
        title: "PO #",
        width: 100,
        render: ({ index }) => <PurchaseOrderCell index={index} />,
      },
      {
        key: "actions",
        title: "",
        width: 140,
        render: ({ index, writable: rowWritable, disabled }) => {
          const row = lineItems[index];
          if (!row) {
            return null;
          }
          if (FROZEN_STATUSES.has(row.status)) {
            return (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Locked
              </Typography.Text>
            );
          }
          if (row.status === "withdrawn") {
            return null;
          }
          return rowWritable ? <WithdrawButton index={index} disabled={disabled} /> : null;
        },
      },
    ],
    [lineItems],
  );

  return (
    <SurfaceFormRoot
      manifest={activeManifest}
      loading={initialLoading}
      blocking={blocking}
      disabled={saving}
      form={form}
      defaultValues={defaultValues}
      resetKey={isCreate ? "create" : `${requisitionId}:${detail?.data?.id ?? ""}`}
    >
      <form onSubmit={onSave}>
        <SurfaceFormLayout>
          <DetailHeader
            title={
              isCreate
                ? "New requisition"
                : `Requisition — ${profile?.job_title ?? profile?.job_id ?? ""}`
            }
          />
          {fieldAllows(activeManifest, "profile", "read") ? (
            <FormSection title="Profile">
              {jobLocked ? (
                <FormFieldItem label="Job">
                  <LinkedSelectControl
                    mode="read"
                    value={jobId}
                    options={jobOptions}
                    loading={jobPickerLoading}
                    canLink
                    linkHref={routes.jobs.detail}
                  />
                </FormFieldItem>
              ) : (
                <LinkedSelectInput<RequisitionDetailFormValues>
                  field="profile"
                  name="profile.job_id"
                  label="Job"
                  options={jobOptions}
                  loading={jobPickerLoading}
                  selectProps={{ showSearch: true, optionFilterProp: "label" }}
                />
              )}
              <TextInput<RequisitionDetailFormValues>
                field="profile"
                name="profile.note"
                label="Note"
              />
              {!isCreate ? (
                <div style={{ marginBottom: 16 }}>
                  <Typography.Text type="secondary">
                    Requested by {profile?.requested_by_display_name ?? "—"}
                    {profile?.requested_at
                      ? ` on ${new Date(profile.requested_at).toLocaleDateString()}`
                      : ""}
                  </Typography.Text>
                </div>
              ) : null}
            </FormSection>
          ) : null}

          {jobId && writable ? (
            <FormSection title="Still needed (BOM)" width="full">
              {bomPoolLoading ? (
                <Typography.Text type="secondary">Loading…</Typography.Text>
              ) : availableBomRows.length === 0 ? (
                <Typography.Paragraph type="secondary">
                  Nothing outstanding on the BOM for this job.
                </Typography.Paragraph>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {availableBomRows.map((row) => (
                    <div
                      key={row.job_line_part_id}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Typography.Text style={{ flex: 1 }}>
                        {row.part_mpn ?? row.part_description ?? row.description} —{" "}
                        <Typography.Text type="secondary">
                          remaining {row.remaining} {row.unit}
                        </Typography.Text>
                      </Typography.Text>
                      <InputNumber
                        size="small"
                        min={0.01}
                        max={row.remaining}
                        value={bomQty[row.job_line_part_id] ?? row.remaining}
                        onChange={(next) =>
                          setBomQty((prev) => ({
                            ...prev,
                            [row.job_line_part_id]: next ?? row.remaining,
                          }))
                        }
                        style={{ width: 90 }}
                      />
                      <Button size="small" onClick={() => addBomRow(row)}>
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          ) : null}

          {fieldAllows(activeManifest, "line_items", "read") ? (
            <FormSection title="Lines" width="full">
              {lineItems.length === 0 ? (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  No lines yet.
                </Typography.Paragraph>
              ) : null}
              <FieldArrayTable<RequisitionDetailFormValues, "line_items">
                field="line_items"
                name="line_items"
                columns={lineColumns}
                createRow={() => ({
                  job_line_part_id: null,
                  part_id: null,
                  description: "",
                  quantity: 1,
                  unit: "ea",
                  status: "open",
                  withdrawal_note: "",
                })}
                fieldArray={lineItemsArray}
                allowAdd={false}
                allowRemove={false}
              />
              {writable ? (
                <Button type="dashed" block style={{ marginTop: 8 }} onClick={addAdhocRow}>
                  Add ad-hoc line
                </Button>
              ) : null}
            </FormSection>
          ) : null}
        </SurfaceFormLayout>
      </form>
    </SurfaceFormRoot>
  );
};
