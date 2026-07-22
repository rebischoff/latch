"use client";

import { surfaceAllows } from "@latch/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useSurfaceFormChrome } from "@/components/surface/SurfaceFormChromeContext";
import { useSurfaceDetail } from "@/lib/hooks/use-surface-detail";
import { useSurfaceDelete } from "@/lib/hooks/use-surface-patch";
import { routes } from "@/lib/nav-routes";
import {
  patchPurchaseOrderLine,
  postPurchaseOrderAdhocLine,
  postPurchaseOrderCancel,
  postPurchaseOrderSend,
  postPurchaseOrderSplit,
} from "@/lib/surface-api";

type Profile = {
  po_number?: string | null;
  status?: string | null;
  job_id?: string | null;
  title?: string | null;
  display_name?: string | null;
  ship_to_note?: string | null;
  delivery_method?: string | null;
  order_date?: string | null;
};

type Shipment = {
  id: string;
  shipment_number: number;
  quantity: number;
  eta_date: string | null;
  status: string;
};

type Source = {
  id: string;
  job_material_request_id: string;
  quantity: number;
  site_zone_id: string | null;
  site_zone_name: string | null;
  request_status: string;
};

type LineItem = {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  part_mpn: string | null;
  status: string;
  ordered_at: string | null;
  shipments: Shipment[];
  sources: Source[];
};

type PurchaseOrderDetailFormProps = {
  purchaseOrderId: string;
};

const statusColor = (status: string): string => {
  switch (status) {
    case "draft":
      return "default";
    case "sent":
    case "ordered":
      return "processing";
    case "received":
      return "success";
    case "cancelled":
    case "rejected":
      return "error";
    case "shipped":
    case "delivered":
      return "warning";
    default:
      return "default";
  }
};

export const PurchaseOrderDetailForm = ({
  purchaseOrderId,
}: PurchaseOrderDetailFormProps) => {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useSurfaceDetail(
    "purchase_order_detail",
    purchaseOrderId,
  );
  const remove = useSurfaceDelete("purchase_order_detail", purchaseOrderId);

  const [adhocOpen, setAdhocOpen] = useState(false);
  const [adhocForm] = Form.useForm();

  const profile = data?.data?.profile as Profile | undefined;
  const activeManifest = data?.manifest;
  const lineItems = (data?.data?.line_items as LineItem[] | undefined) ?? [];
  const status = profile?.status ?? "draft";
  const isDraft = status === "draft";
  const isGeneralBucket = !profile?.job_id;
  const isCancellable =
    status !== "draft" && status !== "cancelled" && status !== "received";
  const canDelete =
    isDraft && activeManifest !== undefined && surfaceAllows(activeManifest, "delete");

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["surface", "purchase_order_detail", purchaseOrderId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["surface", "purchase_order_list"],
    });
    await refetch();
  };

  const sendMutation = useMutation({
    mutationFn: () => postPurchaseOrderSend(purchaseOrderId),
    onSuccess: async () => {
      message.success("Purchase order sent");
      await invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (body: {
      level: "header" | "line" | "shipment";
      purchaseOrderLineId?: string;
      purchaseOrderLineShipmentId?: string;
    }) => postPurchaseOrderCancel(purchaseOrderId, body),
    onSuccess: async () => {
      message.success("Cancelled");
      await invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const adhocMutation = useMutation({
    mutationFn: (values: { description?: string; quantity: number }) =>
      postPurchaseOrderAdhocLine(purchaseOrderId, values),
    onSuccess: async () => {
      message.success("Line added");
      setAdhocOpen(false);
      adhocForm.resetFields();
      await invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const linePatchMutation = useMutation({
    mutationFn: (args: {
      lineId: string;
      description?: string;
      quantity?: number;
    }) => patchPurchaseOrderLine(purchaseOrderId, args.lineId, args),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (err: Error) => message.error(err.message),
  });

  const confirmCancel = async (args: {
    level: "header" | "line" | "shipment";
    purchaseOrderLineId?: string;
    purchaseOrderLineShipmentId?: string;
    label: string;
  }) => {
    const preview = await postPurchaseOrderCancel(purchaseOrderId, {
      ...args,
      previewOnly: true,
    });
    if (preview.data.warningLevel === "blocked") {
      message.warning("Fully received items cannot be cancelled");
      return;
    }
    const strong = preview.data.warningLevel === "strong";
    modal.confirm({
      title: strong ? "Vendor may have already shipped" : `Cancel ${args.label}?`,
      content: strong
        ? "Confirm you've contacted the vendor. This records cancel intent and reopens still-pending material requests."
        : isGeneralBucket
          ? `This will cancel ${args.label}.`
          : `This will cancel ${args.label} and reopen still-pending material requests.`,
      okText: strong ? "Confirm cancel" : "OK",
      okButtonProps: strong ? { danger: true } : undefined,
      onOk: () =>
        cancelMutation.mutateAsync({
          level: args.level,
          purchaseOrderLineId: args.purchaseOrderLineId,
          purchaseOrderLineShipmentId: args.purchaseOrderLineShipmentId,
        }),
    });
  };

  const onDelete = useCallback(() => {
    modal.confirm({
      title: "Delete draft PO?",
      content: isGeneralBucket
        ? "This draft purchase order will be removed."
        : "Material requests return to the open pool.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await remove.mutateAsync();
          message.success("Purchase order deleted");
          router.push(routes.purchaseOrders.list);
          router.refresh();
        } catch {
          message.error("Unable to delete purchase order");
        }
      },
    });
  }, [isGeneralBucket, message, modal, remove, router]);

  useSurfaceFormChrome({
    mode: "edit",
    manifest: activeManifest ?? { fields: {}, actions: [] },
    canSave: false,
    saving: false,
    onSave: () => undefined,
    canDelete,
    onDelete,
  });

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load purchase order.</Typography.Text>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  const subtitle = isGeneralBucket
    ? `General · ${profile?.display_name ?? "—"}`
    : `${profile?.title ?? "—"} · ${profile?.display_name ?? "—"}`;

  return (
    <div style={{ padding: 16 }}>
      <Space
        style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {profile?.po_number ?? "Draft PO"}
          </Typography.Title>
          <Space size="small">
            <Tag color={statusColor(status)}>{status}</Tag>
            {isGeneralBucket ? <Tag>General</Tag> : null}
            <Typography.Text type="secondary">{subtitle}</Typography.Text>
          </Space>
        </div>
        <Space>
          <Link href={routes.purchaseOrders.list}>
            <Button>List</Button>
          </Link>
          {isDraft && isGeneralBucket ? (
            <Button onClick={() => setAdhocOpen(true)}>Add line</Button>
          ) : null}
          {isDraft ? (
            <Button
              type="primary"
              loading={sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              Send
            </Button>
          ) : null}
          {isCancellable ? (
            <Button
              danger
              loading={cancelMutation.isPending}
              onClick={() =>
                void confirmCancel({
                  level: "header",
                  label: "this purchase order",
                })
              }
            >
              Cancel PO
            </Button>
          ) : null}
        </Space>
      </Space>

      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={lineItems}
        expandable={{
          expandedRowRender: (line) => (
            <div>
              <Typography.Text strong>Shipments</Typography.Text>
              <Table
                size="small"
                style={{ marginTop: 8, marginBottom: 16 }}
                rowKey="id"
                pagination={false}
                dataSource={line.shipments}
                columns={[
                  { title: "#", dataIndex: "shipment_number", width: 50 },
                  { title: "Qty", dataIndex: "quantity", width: 80 },
                  {
                    title: "ETA",
                    render: (_, s) =>
                      s.eta_date
                        ? new Date(s.eta_date).toLocaleDateString()
                        : "—",
                  },
                  {
                    title: "Status",
                    render: (_, s) => (
                      <Tag color={statusColor(s.status)}>{s.status}</Tag>
                    ),
                  },
                  {
                    title: "",
                    width: 220,
                    render: (_, s) =>
                      s.status !== "cancelled" && s.status !== "received" ? (
                        <Space>
                          <Button
                            size="small"
                            danger
                            onClick={() =>
                              void confirmCancel({
                                level: "shipment",
                                purchaseOrderLineShipmentId: s.id,
                                label: `shipment #${s.shipment_number}`,
                              })
                            }
                          >
                            Cancel
                          </Button>
                          {line.shipments.length === 1 &&
                          s.status === "scheduled" ? (
                            <Button
                              size="small"
                              onClick={() => {
                                const near = Math.floor(s.quantity / 2) || 1;
                                if (near >= s.quantity) {
                                  message.warning("Need qty > 1 to split");
                                  return;
                                }
                                void postPurchaseOrderSplit(
                                  purchaseOrderId,
                                  line.id,
                                  { nearQuantity: near },
                                )
                                  .then(async () => {
                                    message.success("Shipment split (backorder)");
                                    await invalidate();
                                  })
                                  .catch((err: Error) =>
                                    message.error(err.message),
                                  );
                              }}
                            >
                              Split backorder
                            </Button>
                          ) : null}
                        </Space>
                      ) : null,
                  },
                ]}
              />
              {!isGeneralBucket && line.sources.length > 0 ? (
                <>
                  <Typography.Text strong>Sources</Typography.Text>
                  <Table
                    size="small"
                    style={{ marginTop: 8 }}
                    rowKey="id"
                    pagination={false}
                    dataSource={line.sources}
                    columns={[
                      {
                        title: "Zone",
                        render: (_, src) =>
                          src.site_zone_id
                            ? (src.site_zone_name ?? src.site_zone_id)
                            : "General",
                      },
                      { title: "Qty", dataIndex: "quantity", width: 80 },
                      {
                        title: "Request status",
                        dataIndex: "request_status",
                        width: 140,
                      },
                    ]}
                  />
                </>
              ) : null}
            </div>
          ),
        }}
        columns={[
          { title: "#", dataIndex: "line_number", width: 50 },
          {
            title: "Part / description",
            render: (_, line) => {
              const prefix = line.part_mpn ? `${line.part_mpn} — ` : "";
              if (line.status !== "draft") {
                return `${prefix}${line.description}`;
              }
              return (
                <Space size="small">
                  {prefix ? <span>{prefix}</span> : null}
                  <Typography.Text
                    editable={{
                      onChange: (value) => {
                        const next = value.trim();
                        if (!next || next === line.description) {
                          return;
                        }
                        linePatchMutation.mutate({
                          lineId: line.id,
                          description: next,
                        });
                      },
                    }}
                  >
                    {line.description}
                  </Typography.Text>
                </Space>
              );
            },
          },
          {
            title: "Qty",
            width: 100,
            render: (_, line) => {
              if (line.status !== "draft") {
                return `${line.quantity} ${line.unit}`;
              }
              return (
                <Space size={4}>
                  <Typography.Text
                    editable={{
                      onChange: (value) => {
                        const next = Number(value);
                        if (!(next > 0) || next === line.quantity) {
                          return;
                        }
                        linePatchMutation.mutate({
                          lineId: line.id,
                          quantity: next,
                        });
                      },
                    }}
                  >
                    {String(line.quantity)}
                  </Typography.Text>
                  <span>{line.unit}</span>
                </Space>
              );
            },
          },
          {
            title: "Price",
            width: 100,
            render: (_, line) => line.unit_price.toFixed(2),
          },
          {
            title: "Status",
            width: 110,
            render: (_, line) => (
              <Tag color={statusColor(line.status)}>{line.status}</Tag>
            ),
          },
          {
            title: "",
            width: 100,
            render: (_, line) =>
              line.status !== "cancelled" &&
              line.status !== "rejected" &&
              line.status !== "received" ? (
                <Button
                  size="small"
                  danger
                  onClick={() =>
                    void confirmCancel({
                      level: "line",
                      purchaseOrderLineId: line.id,
                      label: `line #${line.line_number}`,
                    })
                  }
                >
                  Cancel
                </Button>
              ) : null,
          },
        ]}
      />

      <Modal
        title="Add line"
        open={adhocOpen}
        onCancel={() => setAdhocOpen(false)}
        onOk={() => adhocForm.submit()}
        confirmLoading={adhocMutation.isPending}
      >
        <Form
          form={adhocForm}
          layout="vertical"
          initialValues={{ quantity: 1 }}
          onFinish={(values) => adhocMutation.mutate(values)}
        >
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <InputNumber min={0.0001} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
