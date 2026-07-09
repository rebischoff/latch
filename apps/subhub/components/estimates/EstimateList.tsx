"use client";

import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";

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
          title: "Site",
          render: (_, row) => {
            const summary = row.summary as { name?: string | null } | undefined;
            return summary?.name ?? "—";
          },
        },
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
      ]}
    />
  );
};
