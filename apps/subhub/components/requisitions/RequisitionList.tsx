"use client";

import { Table, Tag, Typography } from "antd";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";
import { buildDetailHref } from "@/lib/surface-navigation";

export const RequisitionList = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, isLoading, error } = useSurfaceList("requested_order_list");

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Typography.Text type="danger">Unable to load requisitions.</Typography.Text>
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
        pathname === routes.requisitions.detail(record.id) ? "ant-table-row-selected" : ""
      }
      onRow={() => ({
        style: { cursor: "pointer" },
      })}
      columns={[
        {
          title: "Job",
          render: (_, row) => {
            const summary = row.summary as { title?: string | null } | undefined;
            return (
              <Link
                href={buildDetailHref({
                  detailPath: routes.requisitions.detail(row.id),
                  currentSearch: searchParams,
                })}
              >
                {summary?.title ?? row.id}
              </Link>
            );
          },
        },
        {
          title: "Requested",
          width: 120,
          render: (_, row) => {
            const summary = row.summary as { requested_at?: string | null } | undefined;
            return summary?.requested_at
              ? new Date(summary.requested_at).toLocaleDateString()
              : "—";
          },
        },
        {
          title: "Open lines",
          width: 90,
          render: (_, row) => {
            const summary = row.summary as { open_line_count?: number } | undefined;
            const count = summary?.open_line_count ?? 0;
            return <Tag color={count > 0 ? "processing" : "default"}>{count}</Tag>;
          },
        },
        {
          title: "Note",
          render: (_, row) => {
            const summary = row.summary as { note?: string | null } | undefined;
            return summary?.note || "—";
          },
        },
      ]}
    />
  );
};
