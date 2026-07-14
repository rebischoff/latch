"use client";

import { Table, Typography } from "antd";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSurfaceList } from "@/lib/hooks/use-surface-list";
import { routes } from "@/lib/nav-routes";
import { buildDetailHref } from "@/lib/surface-navigation";

export const EstimateList = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
              <Link
                href={buildDetailHref({
                  detailPath: routes.estimates.detail(row.id),
                  currentSearch: searchParams,
                })}
              >
                {summary?.title ?? row.id}
              </Link>
            );
          },
        },
      ]}
    />
  );
};
