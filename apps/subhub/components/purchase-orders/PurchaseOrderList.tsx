"use client";

import { Button, Space, Table, Tag, Typography } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";
import { buildDetailHref } from "@/lib/surface-navigation";

type Summary = {
  po_number?: string | null;
  status?: string | null;
  job_id?: string | null;
  title?: string | null;
  display_name?: string | null;
  order_date?: string | null;
  created_at?: string | null;
};

const statusColor = (status: string): string => {
  switch (status) {
    case "draft":
      return "default";
    case "sent":
      return "processing";
    case "received":
      return "success";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
};

const jobLabel = (summary: Summary | undefined): string => {
  if (!summary?.job_id) {
    return "General";
  }
  return summary.title ?? summary.job_id;
};

export const PurchaseOrderList = () => {
  const searchParams = useSearchParams();
  const { data, isLoading, error } = useSurfaceList("purchase_order_list");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load purchase orders.</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <Space style={{ marginBottom: 8, width: "100%", justifyContent: "space-between" }}>
        <Typography.Text strong>Purchase orders</Typography.Text>
        <Space>
          <Link href={routes.requisitions.list}>
            <Button size="small">From job</Button>
          </Link>
          <Link href={routes.purchaseOrders.new}>
            <Button size="small" type="primary">
              General
            </Button>
          </Link>
        </Space>
      </Space>
      <Table
        size="small"
        loading={isLoading}
        rowKey="id"
        pagination={false}
        dataSource={data?.data.rows ?? []}
        columns={[
          {
            title: "PO #",
            render: (_, row) => {
              const summary = row.summary as Summary | undefined;
              const label = summary?.po_number ?? "Draft";
              return (
                <Link
                  href={buildDetailHref({
                    detailPath: routes.purchaseOrders.detail(row.id),
                    currentSearch: searchParams,
                  })}
                >
                  {label}
                </Link>
              );
            },
          },
          {
            title: "Status",
            width: 100,
            render: (_, row) => {
              const status = (row.summary as Summary | undefined)?.status ?? "draft";
              return <Tag color={statusColor(status)}>{status}</Tag>;
            },
          },
          {
            title: "Job",
            render: (_, row) => {
              const summary = row.summary as Summary | undefined;
              if (!summary?.job_id) {
                return <Tag>General</Tag>;
              }
              return jobLabel(summary);
            },
          },
          {
            title: "Vendor",
            render: (_, row) =>
              (row.summary as Summary | undefined)?.display_name ?? "—",
          },
          {
            title: "Ordered",
            width: 110,
            render: (_, row) => {
              const d = (row.summary as Summary | undefined)?.order_date;
              return d ? new Date(d).toLocaleDateString() : "—";
            },
          },
        ]}
      />
    </div>
  );
};
