"use client";

import { Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

const STATUS_COLORS: Record<string, string> = {
  draft: "default",
  sent: "processing",
  won: "success",
  lost: "error",
  expired: "warning",
};

const formatDate = (value: string | null | undefined): string =>
  value ? dayjs(value).format("MMM D, YYYY") : "—";

const statusLabel = (status: string): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

export const EstimateList = () => {
  const pathname = usePathname();
  const { data, isLoading, error } = useSurfaceList("estimate_list");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load estimates.</Typography.Text>
      </div>
    );
  }

  return (
    <Table
      size="small"
      loading={isLoading}
      rowKey="id"
      pagination={false}
      dataSource={data?.data.rows ?? []}
      rowClassName={(record) =>
        pathname === routes.estimates.detail(record.id) ? "ant-table-row-selected" : ""
      }
      onRow={() => ({
        style: { cursor: "pointer" },
      })}
      columns={[
        {
          title: "Title",
          render: (_, row) => {
            const summary = row.summary as { title?: string | null } | undefined;
            return (
              <Link href={routes.estimates.detail(row.id)}>
                {summary?.title ?? row.id}
              </Link>
            );
          },
        },
        {
          title: "Site",
          render: (_, row) => {
            const summary = row.summary as { name?: string | null } | undefined;
            return summary?.name ?? "—";
          },
        },
        {
          title: "Status",
          width: 88,
          render: (_, row) => {
            const summary = row.summary as { status?: string | null } | undefined;
            const status = summary?.status ?? "draft";
            return (
              <Tag color={STATUS_COLORS[status] ?? "default"}>{statusLabel(status)}</Tag>
            );
          },
        },
        {
          title: "Date",
          width: 112,
          render: (_, row) => {
            const summary = row.summary as
              | { estimate_date?: string | null }
              | undefined;
            return formatDate(summary?.estimate_date);
          },
        },
      ]}
    />
  );
};
